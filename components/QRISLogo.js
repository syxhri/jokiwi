"use client";

import Image from "next/image";

export default function QRISLogo({
  size = 32,
  className = "",
  alt = "Logo QRIS",
  ...rest
}) {
  return (
    <Image
      src="/images/qris-logo.svg"
      alt={alt}
      width={size}
      height={size}
      className={className}
      {...rest}
    />
  );
}
