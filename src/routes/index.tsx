import { createFileRoute } from "@tanstack/react-router";
import { Background } from "@/components/genesis/Background";
import { Navbar } from "@/components/genesis/Navbar";
import { Hero } from "@/components/genesis/Hero";
import { TrustStrip } from "@/components/genesis/TrustStrip";
import { CommunityBanner } from "@/components/genesis/CommunityBanner";
import { VideoTutorial } from "@/components/genesis/VideoTutorial";
import { FeaturedProducts } from "@/components/genesis/FeaturedProducts";
import { Benefits } from "@/components/genesis/Benefits";
import { FAQ } from "@/components/genesis/FAQ";
import { FinalCTA } from "@/components/genesis/FinalCTA";
import { Footer } from "@/components/genesis/Footer";

const HOME_TITLE = "Love Hyro - Congele seus Créditos no Lovable";
const HOME_DESC =
  "Extensão Love Hyro: congele e economize seus créditos no Lovable.dev. Ativação automática via PIX, liberação na hora e planos a partir de R$ 7,90.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: HOME_TITLE },
      { name: "description", content: HOME_DESC },
      { property: "og:title", content: HOME_TITLE },
      { property: "og:description", content: HOME_DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="dark relative min-h-screen text-white overflow-x-hidden">
      <Background />
      <Navbar />
      <main>
        <Hero />
        <TrustStrip />
        <CommunityBanner />
        <VideoTutorial />
        <FeaturedProducts />
        <Benefits />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
