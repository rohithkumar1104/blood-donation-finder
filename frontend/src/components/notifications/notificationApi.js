
const NOTIFICATION_API_URL =
  "https://blood-donation-finder-awce.onrender.com/api/notifications/";
const TOKEN_KEY = "authToken";

export async function notificationApiRequest(
  endpoint = "",
  method = "GET"
) {
  const token = localStorage.getItem(TOKEN_KEY);

  if (!token) {
    throw new Error("Please log in to access notifications.");
  }

  const response = await fetch(
    `${NOTIFICATION_API_URL}${endpoint}`,
    {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${token}`,
      },
    }
  );

  let data = {};

  try {
    data = await response.json();
  } catch {
    // Handle responses without JSON content.
  }

  if (response.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = "/login";

    throw new Error(
      "Your session has expired. Please log in again."
    );
  }

  if (!response.ok) {
    throw new Error(
      data?.detail ||
      data?.message ||
      `Notification request failed with status ${response.status}.`
    );
  }

  return data;
}
