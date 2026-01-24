import LoginClient from "./loginClient";

export const metadata = {
  title: "Jokiwi - Login",
  description: "Login ke akun Jokiwi",
};

export default async function LoginPage({ searchParams }) {
  const next = searchParams?.next || "/";

  return <LoginClient next={next} />;
}
