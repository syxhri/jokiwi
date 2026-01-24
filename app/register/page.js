import RegisterClient from "./registerClient";

export const metadata = {
  title: "Jokiwi - Register",
  description: "Buat akun Jokiwi",
};

export default async function RegisterPage({ searchParams }) {
  const next = searchParams?.next || "/";

  return <RegisterClient next={next} />;
}
