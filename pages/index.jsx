import dynamic from "next/dynamic";
import Head from "next/head";
import data from "../data/fortaleza.json";
const Map = dynamic(() => import("../components/Map"), {
  ssr: false
});

const Home = () => {
  return (
    <div className="container">
      <Map
        data={data}
        variable="qtd_unidades_residencial"
        scaleMethod="Quantize"
        scaleColor="Sequencial"
      />
    </div>
  );
}

export default Home;