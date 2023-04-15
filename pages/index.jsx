import dynamic from "next/dynamic";
import Head from "next/head";
import data from "../data/polygons.json";
const Map = dynamic(() => import("../components/Map"), {
  ssr: false
});

const Home = () => {
  const lat = data.typeMap === "markers" ? data.features[0].geometry.coordinates[0] : data.features[0].geometry.coordinates[0][0][1];
  const lon = data.typeMap === "markers" ? data.features[0].geometry.coordinates[1] : data.features[0].geometry.coordinates[0][0][0];
  return (
    <div className="container">
      <Map
        data={data}
        coordinates={[lat, lon]}
        variable="violência"
        scaleMethod="Quantile"
        scaleColor="Sequencial"
        agrouped="mean"
      />
    </div>
  );
}

export default Home;