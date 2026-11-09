import { Suspense } from "react";
import { Profile } from "@/components/customer/profile";
import { Splash } from "@/components/ui";

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <Suspense fallback={<Splash />}>{params.then(({ slug }) => <Profile slug={slug} />)}</Suspense>;
}
