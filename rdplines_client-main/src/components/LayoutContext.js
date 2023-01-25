import React, { useState } from "react";
import { faker } from "@faker-js/faker";

export const LayoutContext = React.createContext();

const LayoutContextProvider = ({ children }) => {
  const borderColor = "rgb(99, 102, 241)";
  const backgroundColor = "rgb(165, 180, 252)";
  const [file, setFile] = useState(null);
  const [data, setData] = useState(null);
  const [options, setOptions] = useState({
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: "Chart.js Line Chart",
      },
    },
  });

  const [labels, setLabels] = useState([
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
  ]);

  const [info, setInfo] = useState({
    labels,
    datasets: [
      {
        label: "Dataset 1",
        data: labels.map(() =>
          faker.datatype.number({ min: -1000, max: 1000 })
        ),
        borderColor,
        backgroundColor,
      },
    ],
  });

  return (
    <LayoutContext.Provider
      value={{
        file,
        setFile,
        data,
        setData,
        options,
        setOptions,
        labels,
        setLabels,
        info,
        setInfo,
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
};

export default LayoutContextProvider;
