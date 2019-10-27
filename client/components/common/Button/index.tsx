import React from "react";

import styles from "./Button.module.less";
import Link from "next/link";

interface Props {
  path: string;
}

export const ButtonLink: React.FC<Props> = ({ path, children, ...buttonProps }) => {
  return (
    <Link href={path} as={path}>
      <button className={styles.buttonLink} {...buttonProps}>
        {children}
      </button>
    </Link>
  );
};
