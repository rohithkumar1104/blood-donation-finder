
import csv
import io
import zipfile
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from locations.models import State, District, SubDistrict


ZIP_PATH = (
    Path(settings.BASE_DIR)
    / "data"
    / "locations"
    / "india_locations.csv.zip"
)

CSV_NAME = (
    "list-of-states-districts-sub-districts-and-villages-"
    "along-with-their-lgd-codes-as-of-12-oct-2026.csv"
)

# Union Territories represented in the supplied dataset.
UNION_TERRITORY_CODES = {"1", "7", "31", "34", "35", "37", "38"}


class Command(BaseCommand):
    help = "Import Indian states, districts and sub-districts from the LGD dataset."

    def handle(self, *args, **options):
        if not ZIP_PATH.exists():
            raise CommandError(f"Dataset ZIP not found: {ZIP_PATH}")

        states_data = {}
        districts_data = {}
        sub_districts_data = {}

        required_columns = {
            "state_code",
            "state_name",
            "district_code",
            "district_name",
            "sub-district_code",
            "sub-district_name",
        }

        self.stdout.write("Reading the LGD dataset...")

        try:
            with zipfile.ZipFile(ZIP_PATH, "r") as archive:
                with archive.open(CSV_NAME) as csv_file:
                    text_file = io.TextIOWrapper(
                        csv_file,
                        encoding="utf-8-sig",
                        newline="",
                    )
                    reader = csv.DictReader(text_file)

                    if not required_columns.issubset(reader.fieldnames or []):
                        raise CommandError(
                            "The CSV does not contain all required columns."
                        )

                    for row in reader:
                        state_code = row["state_code"].strip()
                        state_name = row["state_name"].strip()
                        district_code = row["district_code"].strip()
                        district_name = row["district_name"].strip()
                        sub_code = row["sub-district_code"].strip()
                        sub_name = row["sub-district_name"].strip()

                        if not all([
                            state_code, state_name,
                            district_code, district_name,
                            sub_code, sub_name,
                        ]):
                            continue

                        self.add_checked(
                            states_data, state_code, state_name, "state"
                        )
                        self.add_checked(
                            districts_data,
                            (state_code, district_code),
                            district_name,
                            "district",
                        )
                        self.add_checked(
                            sub_districts_data,
                            (state_code, district_code, sub_code),
                            sub_name,
                            "sub-district",
                        )

        except (zipfile.BadZipFile, KeyError) as error:
            raise CommandError(f"Could not read the dataset: {error}") from error

        self.stdout.write("Importing locations into the database...")

        with transaction.atomic():
            state_objects = {}

            for code, name in states_data.items():
                state, _ = State.objects.update_or_create(
                    lgd_code=code,
                    defaults={
                        "name": name,
                        "is_union_territory": code in UNION_TERRITORY_CODES,
                    },
                )
                state_objects[code] = state

            district_objects = {}

            for (state_code, district_code), name in districts_data.items():
                district, _ = District.objects.update_or_create(
                    state=state_objects[state_code],
                    lgd_code=district_code,
                    defaults={"name": name},
                )
                district_objects[(state_code, district_code)] = district

            for (state_code, district_code, sub_code), name in sub_districts_data.items():
                SubDistrict.objects.update_or_create(
                    district=district_objects[(state_code, district_code)],
                    lgd_code=sub_code,
                    defaults={"name": name},
                )

        self.stdout.write(self.style.SUCCESS("Location import completed!"))
        self.stdout.write(f"States/UTs: {len(states_data)}")
        self.stdout.write(f"Districts: {len(districts_data)}")
        self.stdout.write(f"Sub-districts: {len(sub_districts_data)}")

    @staticmethod
    def add_checked(data, key, name, label):
        existing_name = data.get(key)

        if existing_name is not None and existing_name != name:
            raise CommandError(
                f"Conflicting {label} names for code {key}: "
                f"{existing_name!r} and {name!r}"
            )

        data[key] = name
