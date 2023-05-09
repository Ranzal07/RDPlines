import React, { useContext, useEffect, useState } from "react";
import FileSaver from "file-saver";
import jStat from "jstat";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { LayoutContext } from "../components/LayoutContext";
import { Circles, TailSpin } from "react-loader-spinner";
import { Link } from "react-router-dom";
import "../../src/App.css";

const Results = () => {
  const context = useContext(LayoutContext);
  const [confidenceLevel, setConfidenceLevel] = useState(90);
  const [moeLoading, setMoeLoading] = useState(true);
  const [moeBefore, setMoeBefore] = useState("?");
  const [moeAfter, setMoeAfter] = useState("?");

  useEffect(() => {
    console.log(context.file);
  });

  // eslint-disable-next-line no-unused-vars
  const dataPointsDiff = () => {
    const total = context.data.row_2.length;
    const simplifiedPoints = context.data.row_2_rdp.filter(
      (item) => item
    ).length;

    const result = Math.trunc((simplifiedPoints / total) * 100);
    return `${result}% less`;
  };

  const computeMOEs = (cl) => {
    setMoeLoading(true);

    const before = marginOfError(context.data.row_2, cl);
    const after = marginOfError(context.data.row_2_rdp, cl);

    setMoeBefore(before);
    setMoeAfter(after);

    console.log(moeBefore);
    console.log(moeAfter);

    setMoeLoading(true);
  };

  const marginOfError = (data, confidenceLevel) => {
    const n = data.length;
    const mean = data.reduce((a, b) => a + b) / n;
    const variance = data.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1);
    const stdev = Math.sqrt(variance);
    const z = Math.abs(jStat.normal.inv((1 - confidenceLevel) / 2, 0, 1));
    const margin = (z * stdev) / Math.sqrt(n);
    const roundedMarginOfError = Math.round(margin);
    console.log(roundedMarginOfError);

    return roundedMarginOfError;
  };

  const getMeanVal = (points = []) => {
    const filteredPoints = points.filter((item) => item);
    const pointsSum = filteredPoints.reduce((a, b) => a + b);

    const mean = (pointsSum / filteredPoints.length).toFixed(2);
    return mean;
  };

  const getStandardDeviation = (points = []) => {
    const filteredPoints = points.filter((item) => item);
    const populationSize = filteredPoints.length;
    const populationMean = getMeanVal(points);

    const numerator = filteredPoints.reduce((acc, point) => {
      const summ = (point - populationMean) * (point - populationMean);

      return acc + summ;
    });

    const standardDeviation = Math.sqrt(numerator / populationSize).toFixed(2);

    return standardDeviation;
  };

  // receive the file from the flask server
  const handleDownload = async () => {
    fetch("/download")
      .then((response) => response.blob())
      .then((blob) => {
        // Use the file-saver package to trigger a download
        FileSaver.saveAs(blob, context.data.new_file_name);
      });
  };

  return (
    <div className="font-sans min-h-screen relative overflow-hidden bg-sky-50/50 pb-[300px]">
      <div className="full-width flex flex-col justify-center z-1">
        <nav className="flex justify-center py-12">
          <Link to={`/`}>
            <img src="/images/logo.png" alt="" className="h-14" />
          </Link>
        </nav>

        {!context.data ? (
          <div className="w-full flex justify-center pt-20">
            <Circles
              height="100"
              width="100"
              color="#4338ca"
              ariaLabel="circles-loading"
              wrapperStyle={{}}
              wrapperClass=""
              visible={true}
            />
          </div>
        ) : (
          <>
            <div className="full-width font-bold text-center flex justify-center flex-col">
              <p className="mb-3 mt-6 text-[#666666] text-sm">
                {context.data.new_file_name}
              </p>
              <div id="legend-container" className="flex justify-center mb-4" />
            </div>

            <div className="pb-12 rounded-3xl flex justify-center" style={{ width: '75%', margin: 'auto'}}>
              <Chart data={context.data} />
            </div>
          </>
        )}

        <div className="max-w-7xl container">
          <div className="relative mt-[100px]">
            <div className="absolute w-[350%] animate-move-infinite">
              <img
                src="/images/line-2.png"
                alt="infinity line"
                className="h-[180px] w-[350%]"
              />
            </div>
            <div className="text-center flex items-center flex-col relative z-2">
              <h2 className="mt-6 text-4xl text-gray-800 font-medium">
                Compare RDP Line Simplification Results
              </h2>
              <p className="text-gray-500 mt-6 font-regular text-xl w-7/12">
                Check out the difference between the original and the simplified
                resulting version of this tool which you can download
              </p>
            </div>
          </div>

          <div className="flex justify-center mt-16 mb-[200px]">
            <table className="table-fixed text-center">
              <thead className="bg-slate-200 border">
                <tr className="py-6">
                  <th className="border"></th>
                  <th className="border py-3">Original Line</th>
                  <th className="border">Parallel RDP</th>
                </tr>
              </thead>
              <tbody className="text-slate-500 ">
                <Row
                  title="No. of data points"
                  original={`${context.data.row_2.length}`}
                  parallel={`${
                    context.data.row_2_rdp.filter((item) => item).length
                  }`}
                />
                <Row
                  title="Mean Value"
                  original={`${getMeanVal(context.data.row_2)}`}
                  parallel={`${getMeanVal(context.data.row_2_rdp)}`}
                />
                <Row
                  title="Standard deviation"
                  original={`${getStandardDeviation(context.data.row_2)}`}
                  parallel={`${getStandardDeviation(context.data.row_2_rdp)}`}
                />
                <Row
                  title="File size"
                  original={`${context.data.file_type}`}
                  parallel={`${context.data.new_file_type}`}
                />
                <Row
                  title="Epsilon Value"
                  original={`${context.data.epsilon}`}
                />
                <tr className="border-b border-slate-200">
                  <td className="text-left pl-10 py-5 text-slate-700 font-semibold">
                    File name
                  </td>
                  <td>{`${context.data.new_file_name}`}</td>
                  <td>
                    <button
                      onClick={handleDownload}
                      className="bg-indigo-700 py-2 px-5 rounded-lg text-white font-semibold"
                    >
                      Download File
                    </button>
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex pb-[250px] mb-6 relative">
            {/* table */}
            <div className="flex-1 w-full">
              <table className="table-fixed text-center w-full mt-[15%]">
                <thead className="bg-slate-200 border-b-[28px] border-slate-50">
                  <tr className="">
                    <th className="border py-4">T-statistic</th>
                    <th className="border">P-value</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700 font-medium text-[30px] mt-4">
                  <tr className="">
                    <td className="py-4 border-r border-gray-300">
                      {context.data.t_statistic.toFixed(3)}
                    </td>
                    <td>{context.data.p_value.toFixed(3)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* description */}
            <div className="flex-1 ml-8 pl-12">
              <h2 className="mt-6 text-4xl text-gray-800 font-medium">
                T-Test
              </h2>
              <p className="text-gray-500 mt-6 font-regular text-lg">
                A t-test is used to see if there's a significant difference
                between the means of two datasets.
              </p>
              <p className="text-gray-500 mt-6 font-regular text-lg">
                In general, if the p-value returned by the t-test function is
                less than some chosen significance level (often 0.05), it is
                considered to be statistically significant and the null
                hypothesis is rejected. A t-statistic of 0 indicates that there
                is no significant difference between the means of the two
                samples.
              </p>
            </div>

            {/* flowy line */}
            <div className="absolute w-[350%] bottom-0 animate-move-infinite">
              <img
                src="/images/line-2.png"
                alt="infinity line"
                className="h-[180px] w-[350%]"
              />
            </div>
          </div>

          <div className="flex pb-6 pt-6">
            {/* input confidence level */}
            <div className=" flex-1 mr-8 pr-12">
              <h2 className="mt-6 text-4xl text-gray-800 font-medium">
                Margin of Error Calculator
              </h2>
              <p className="text-gray-500 mt-6 font-regular text-lg">
                In statistics, the margin of error is a measure of the amount of
                random sampling error that is present in a survey or sample
                estimate of a population parameter.
              </p>

              <form className="w-full my-6">
                <div className="w-full mb-6 md:mb-0">
                  <div className="w-full">
                    <label
                      className="block uppercase tracking-wide text-gray-700 text-xs font-bold mb-2"
                      htmlFor="grid-last-name"
                    >
                      Confidence Level (%)
                    </label>

                    <div className="flex items-center relative">
                      <input
                        className="appearance-none block w-full text-xl text-gray-800 border border-gray-400 rounded py-3 px-4 leading-tight focus:outline-none focus:border-indigo-500 bg-white"
                        id="grid-last-name"
                        type="text"
                        placeholder="98"
                        onChange={(e) => setConfidenceLevel(e.target.value)}
                      />
                      <button
                        id="btnId"
                        type="button"
                        className="absolute right-0 px-8 text-indigo-800 font-semibold"
                        onClick={() => {
                          const cl = confidenceLevel / 100;
                          computeMOEs(cl);
                        }}
                      >
                        {moeLoading ? (
                          `Go`
                        ) : (
                          <TailSpin
                            height="20"
                            width="20"
                            color="#4f46e5"
                            ariaLabel="tail-spin-loading"
                            radius="1"
                            wrapperStyle={{}}
                            wrapperClass=""
                            visible={true}
                          />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </form>

              <p className="text-gray-500 mt-6 font-regular text-md">
                Enter your desired confidence level to get the margin of error
                for the original and simplified data.
              </p>
            </div>

            {/* table */}
            <div className="flex-1 w-full">
              <table className="table-fixed text-center w-full mt-[15%]">
                <thead className="bg-slate-200 border-b-[28px] border-slate-50">
                  <tr className="">
                    <th className="border py-4">Original</th>
                    <th className="border">Simplified</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700 font-medium text-[30px] mt-4">
                  <tr className="">
                    <td className="py-4 border-r border-gray-300">
                      {moeBefore}% MOE
                    </td>
                    <td>{moeAfter}% MOE</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Results;

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const getOrCreateLegendList = (chart, id) => {
  const legendContainer = document.getElementById(id);
  console.log({ legendContainer });

  let listContainer = legendContainer.querySelector("ul");

  if (!listContainer) {
    listContainer = document.createElement("ul");
    listContainer.style.display = "flex";
    listContainer.style.flexDirection = "row";
    listContainer.style.margin = "0";
    listContainer.style.padding = "0";

    legendContainer.appendChild(listContainer);
  }

  return listContainer;
};

const htmlLegendPlugin = {
  id: "htmlLegend",
  afterUpdate(chart, args, options) {
    const ul = getOrCreateLegendList(chart, options.containerID);
    // Remove old legend items
    while (ul.firstChild) {
      ul.firstChild.remove();
    }

    // Reuse the built-in legendItems generator
    const items = chart.options.plugins.legend.labels.generateLabels(chart);

    items.forEach((item) => {
      const li = document.createElement("li");
      li.style.alignItems = "center";
      li.style.cursor = "pointer";
      li.style.display = "flex";
      li.style.flexDirection = "row";
      li.style.marginLeft = "10px";

      li.onclick = () => {
        const { type } = chart.config;
        if (type === "pie" || type === "doughnut") {
          // Pie and doughnut charts only have a single dataset and visibility is per item
          chart.toggleDataVisibility(item.index);  
        } else {
          chart.setDatasetVisibility(
            item.datasetIndex,
            !chart.isDatasetVisible(item.datasetIndex)
          );
        }
        chart.update();
      };

      // Color box
      const boxSpan = document.createElement("span");
      boxSpan.style.background = item.fillStyle;
      boxSpan.style.borderColor = item.strokeStyle;
      boxSpan.style.borderWidth = String(item.lineWidth) + "px";
      boxSpan.style.display = "inline-block";
      boxSpan.style.height = "20px";
      boxSpan.style.marginRight = "10px";
      boxSpan.style.width = "20px";

      // Text
      const textContainer = document.createElement("p");
      textContainer.style.color = item.fontColor;
      textContainer.style.margin = "0";
      textContainer.style.padding = "0";
      textContainer.style.textDecoration = item.hidden ? "line-through" : "";

      const text = document.createTextNode(item.text);
      textContainer.appendChild(text);

      li.appendChild(boxSpan);
      li.appendChild(textContainer);
      ul.appendChild(li);
    });
  },
};

function Chart({ data }) {
  const chartOptions = {
    responsive: true,
    plugins: {
      htmlLegend: {
        containerID: "legend-container",
      },
      legend: {
        display: false,
      },
    },
    layout: {
      padding: {
        left: 10,
        right: 10,
        top: 0,
        bottom: 0,
      },
    },
    scales: {
      x: {
        ticks: {
          font: {
            size: 25,
          },
          maxTicksLimit: 10,
          maxRotation: 50, // Disable label rotation
        },
      },
      y: {
        ticks: {
          font: {
            size: 25,
          },  
        },
      },
    },
  };

  const settings = {
    labels: data.row_1,
    datasets: [
      {
        label: `Parallel Line`,
        data: data.row_2_rdp,
        borderColor: "rgb(79, 70, 229)",
        backgroundColor: "rgba(79, 70, 229, 0.5)",
        spanGaps: true,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
      },
      {
        label: `Original Line`,
        data: data.row_2,
        borderColor: "rgb(6, 182, 212)",
        backgroundColor: "rgba(6, 182, 212, 0.5)",
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
      },
    ],
  };

  /* ADDING two div for scrollbar and width & height */
  return (
      <Line
        options={chartOptions}
        data={settings}
        plugins={[htmlLegendPlugin]}
      />
  );
}

function Row({ title, original, parallel }) {
  return (
    <tr className="border-b border-slate-200">
      <td className="text-left text-slate-700 pl-10 py-5 font-semibold">
        {title}
      </td>
      <td>{original}</td>
      <td>{parallel}</td>
    </tr>
  );
}
