"use client";
import { Button } from "@/modules/cores/shadcn/components/ui/button";
import { useInAccountShell } from "@/components/candidate/account-shell";
export default function ProfileError({ reset }: { reset: () => void }) {
  const inAccountShell = useInAccountShell();
  const Container = inAccountShell ? "div" : "main";
  return (
    <Container
      id={inAccountShell ? undefined : "main"}
      className={inAccountShell ? undefined : "site-container page-content"}
    >
      <section className="surface empty-state">
        <h1>Chưa tải được hồ sơ</h1>
        <p>Vui lòng thử lại sau.</p>
        <Button onClick={reset}>Thử lại</Button>
      </section>
    </Container>
  );
}
