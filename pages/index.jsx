import dynamic from "next/dynamic";
import Head from "next/head";
import data from "../data/exPolygon.json";
const Map = dynamic(() => import("../components/Map"), {
  ssr: false
});

const Home = () => {
  return (
    <div className="container">
      <Map
        data={data}
        variable="Question 3"
        scaleMethod="Quantize"
        scaleColor="Sequencial"
        agrouped={"mean"}
      />
    </div>
  );
}

export default Home;