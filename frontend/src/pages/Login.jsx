import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function DropIcon({ className = "h-5 w-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2.5c-.4 0-.8.2-1 .5C8.2 6.7 5 10.4 5 14.2A7 7 0 0 0 12 21a7 7 0 0 0 7-6.8c0-3.8-3.2-7.5-6-11.2-.2-.3-.6-.5-1-.5Z" />
    </svg>
  );
}

function Field({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  children,
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1 block text-sm font-medium text-neutral-800"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={type}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          required
          placeholder={placeholder}
          className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-red-600 focus:bg-white focus:ring-4 focus:ring-red-100"
        />
        {children}
      </div>
    </div>
  );
}

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function handleChange(event) {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/auth/login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Login failed.");
      }

      // Store the authentication token for future API requests.
      localStorage.setItem("authToken", data.token);

      navigate("/home");

      // We'll add dashboard navigation after creating the dashboard.
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex h-dvh items-center justify-center overflow-hidden bg-red-50 p-3 sm:p-6">
      <div className="grid max-h-full w-full max-w-5xl overflow-hidden rounded-[2rem] border border-red-100 bg-white shadow-xl shadow-red-900/10 lg:grid-cols-[1fr_1.1fr]">
        {/* Left: red brand panel */}
        <aside className="relative hidden flex-col justify-between bg-red-600 p-10 text-white lg:flex">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-red-600">
              <DropIcon />
            </span>
            <span className="text-lg font-semibold tracking-tight">
              BloodLink
            </span>
          </div>

          <div>
            <h2 className="max-w-xs text-3xl font-semibold leading-tight tracking-tight">
              Good to see you again.
            </h2>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-red-100">
              Log in to see new blood requests near you and keep track of your
              donations.
            </p>

            {/* Chat-style preview, echoing the reference UI */}
            <div className="mt-10 space-y-3">
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white p-4 text-sm text-neutral-900">
                <p className="font-medium text-red-600">Thank you, donor</p>
                <p className="mt-1 text-neutral-600">
                  Your last donation helped 3 patients.
                </p>
                <p className="mt-2 text-xs text-neutral-400">12:16 PM</p>
              </div>
              <div className="ml-auto w-fit rounded-2xl rounded-tr-sm border border-red-400 bg-red-700 px-4 py-2.5 text-sm">
                Show me new requests
              </div>
            </div>
          </div>

          <p className="text-xs text-red-100">
            Your details are only shared with verified requests.
          </p>
        </aside>

        {/* Right: white form panel */}
        <section className="flex items-center px-6 py-6 sm:px-12 sm:py-8">
          <div className="mx-auto w-full max-w-sm">
            <div className="mb-4 flex items-center gap-3 lg:hidden">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-white">
                <DropIcon />
              </span>
              <span className="text-lg font-semibold tracking-tight text-red-600">
                BloodLink
              </span>
            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-neutral-500">
              Log in to your account.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-3">
              <Field
                id="username"
                label="Username"
                autoComplete="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Enter your username"
              />

              <Field
                id="password"
                label="Password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
              >
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute inset-y-0 right-3 my-auto h-fit rounded-md px-2 py-1 text-xs font-medium text-neutral-500 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </Field>

              {message && (
                <p
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Logging in..." : "Log in"}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-neutral-500">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="font-semibold text-red-600 underline-offset-4 hover:underline"
              >
                Create one
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Login;
