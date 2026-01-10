"use client";

import Image from "next/image";

const LOGO_SOURCES = {
  normal: "/images/logo-jokiwi.svg",
  white: "/images/logo-jokiwi-white.svg",
  flat: "/images/logo-jokiwi-flat.svg",
  flatWhite: "/images/logo-jokiwi-flat-white.svg",
};

export default function JokiwiLogo({
  variant = "flat",
  size = 32,
  className = "",
  alt = "Logo Jokiwi",
  ...rest
}) {
  const src = LOGO_SOURCES[variant] ?? LOGO_SOURCES.gradient;

  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={className}
      {...rest}
    />
  );
}
