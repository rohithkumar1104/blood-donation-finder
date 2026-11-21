
import csv
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from blood_groups.models import BloodGroup


class Command(BaseCommand):
    help = "Import blood groups from the project's CSV file."

    def handle(self, *args, **options):
        csv_path = (
            Path(__file__).resolve().parents[3]
            / "data"
            / "blood_groups"
            / "blood_groups.csv"
        )

        if not csv_path.is_file():
            raise CommandError(f"CSV file not found: {csv_path}")

        created_count = 0
        updated_count = 0

        with csv_path.open("r", encoding="utf-8-sig", newline="") as file:
            reader = csv.DictReader(file)
            required_columns = {
                "code", "name", "abo_group", "rh_factor"
            }

            if not reader.fieldnames or not required_columns.issubset(
                reader.fieldnames
            ):
                raise CommandError(
                    "CSV must contain: code, name, abo_group, rh_factor"
                )

            for row in reader:
                _, created = BloodGroup.objects.update_or_create(
                    code=row["code"].strip(),
                    defaults={
                        "name": row["name"].strip(),
                        "abo_group": row["abo_group"].strip(),
                        "rh_factor": row["rh_factor"].strip(),
                    },
                )

                if created:
                    created_count += 1
                else:
                    updated_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Import complete. Created: {created_count}; "
                f"updated: {updated_count}."
            )
        )
