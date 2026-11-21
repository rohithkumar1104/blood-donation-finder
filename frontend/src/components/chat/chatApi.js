
const CHAT_API_URL = "https://blood-donation-finder-awce.onrender.com/api/chats/";

const TOKEN_KEY = "authToken";

export async function chatApiRequest(
  endpoint,
  method = "GET",
  body = null
) {
  const token = localStorage.getItem(TOKEN_KEY);

  if (!token) {
    throw new Error("Please log in to access chats.");
  }

  const response = await fetch(`${CHAT_API_URL}${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = {};

  try {
    data = await response.json();
  } catch {
    // Response may have no JSON body.
  }

  if (response.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = "/login";
    throw new Error("Your session has expired. Please log in again.");
  }

  if (!response.ok) {
    throw new Error(
      data?.detail ||
      data?.message ||
      `Chat request failed with status ${response.status}.`
    );
  }

  return data;
}
