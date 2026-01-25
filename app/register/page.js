import RegisterClient from "./registerClient";

export const metadata = {
  title: "Jokiwi - Register",
  description: "Buat akun Jokiwi",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function RegisterPage({ searchParams }) {
  const next = searchParams?.next || "/";

  return <RegisterClient next={next} />;
}
