import LoginClient from "./loginClient";

export const metadata = {
  title: "Jokiwi - Login",
  description: "Login ke akun Jokiwi",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function LoginPage({ searchParams }) {
  const next = searchParams?.next || "/";

  return <LoginClient next={next} />;
}
