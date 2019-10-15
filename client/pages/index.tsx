import React from "react";
import Head from "next/head";
import Layout from "../components/common/Layout";
import { useMeQuery } from "../generated/graphql";

import styles from "./Home.module.less";
import { HeaderText, HeaderSubText } from "../components/common/Text";
import { Button } from "antd";
import Link from "next/link";

const Home: React.FC = () => {
  const { data } = useMeQuery();

  if (!data) {
    return (
      <Layout>
        <div />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={styles.main}>
        <div className={styles.primaryHeader}>
          <div className={styles.left}>
            <HeaderText white={1} style={{ marginBottom: "28px" }}>
              {"Plan and collaborate on projects faster than ever"}
            </HeaderText>

            <HeaderSubText white={1} style={{ marginBottom: "28px" }}>
              {
                "Our app helps developers organize and plan out projects simply so you can prioritize development and pushing out features"
              }
            </HeaderSubText>

            <Link href="/register">
              <Button type="primary">
                <a>Start your account - it's free</a>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Home;
