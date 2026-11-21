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

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    password2: "",
  });

  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    if (formData.password !== formData.password2) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/auth/register/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          Object.values(data).flat().join(" ") || "Registration failed.",
        );
      }

      navigate("/login");

      setFormData({
        username: "",
        email: "",
        password: "",
        password2: "",
      });
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex h-dvh items-center justify-center overflow-hidden bg-red-50 p-3 sm:p-6">
      {/* Popup Error Notification */}
      {message && (
        <div
          role="alert"
          className="fixed right-5 top-5 z-50 flex w-[calc(100%-2.5rem)] max-w-sm items-center gap-3 rounded-xl border border-red-200 bg-white px-5 py-4 shadow-xl animate-[fadeIn_0.25s_ease-out]"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 font-bold text-red-600">
            !
          </span>

          <p className="flex-1 text-sm font-medium text-neutral-800">
            {message}
          </p>

          <button
            type="button"
            onClick={() => setMessage("")}
            className="rounded-md px-2 py-1 text-lg text-neutral-400 hover:text-red-600"
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
      )}

      <div className="grid max-h-full w-full max-w-5xl overflow-hidden rounded-[2rem] border border-red-100 bg-white shadow-xl shadow-red-900/10 lg:grid-cols-[1fr_1.1fr]">
        {/* Left: Red Brand Panel */}
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
              One account. Someone's second chance.
            </h2>

            <p className="mt-3 max-w-xs text-sm leading-relaxed text-red-100">
              Register as a donor, respond to nearby requests and track every
              donation you make.
            </p>

            <div className="mt-10 space-y-3">
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white p-4 text-sm text-neutral-900">
                <p className="font-medium text-red-600">O− needed urgently</p>

                <p className="mt-1 text-neutral-600">
                  2 units at City Hospital, 3 km from you.
                </p>

                <p className="mt-2 text-xs text-neutral-400">12:16 PM</p>
              </div>

              <div className="ml-auto w-fit rounded-2xl rounded-tr-sm border border-red-400 bg-red-700 px-4 py-2.5 text-sm">
                I can donate today
              </div>
            </div>
          </div>

          <p className="text-xs text-red-100">
            Your details are only shared with verified requests.
          </p>
        </aside>

        {/* Right: Registration Form */}
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
              Create your account
            </h1>

            <p className="mt-2 text-sm text-neutral-500">
              Join our community and help save lives.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-3">
              <Field
                id="username"
                label="Username"
                autoComplete="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Choose a username"
              />

              <Field
                id="email"
                label="Email address"
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
              />

              <Field
                id="password"
                label="Password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a password"
              >
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute inset-y-0 right-3 my-auto h-fit rounded-md px-2 py-1 text-xs font-medium text-neutral-500 hover:text-red-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </Field>

              <Field
                id="password2"
                label="Confirm password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={formData.password2}
                onChange={handleChange}
                placeholder="Enter your password again"
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Creating account..." : "Create account"}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-neutral-500">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-semibold text-red-600 underline-offset-4 hover:underline"
              >
                Log in
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Register;
