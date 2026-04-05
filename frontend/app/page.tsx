import HomePage from "./HomeClient";

export async function generateMetadata() {
  return {
    title: "RLTF",
    description: "RLTF | Home",
  };
}

export default function Page() {
  return <HomePage />;
}
