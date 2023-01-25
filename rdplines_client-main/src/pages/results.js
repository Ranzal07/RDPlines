import React, { useContext, useEffect } from "react";
import FileSaver from 'file-saver';
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
import { Circles } from "react-loader-spinner";
import { Link } from "react-router-dom";

const Results = () => {
  const context = useContext(LayoutContext);

  useEffect(() => {
    console.log(context.file);
  }, );

  const dataPointsDiff = () => {
    const total = context.data.row_2.length;
    const simplifiedPoints = context.data.row_2_rdp.filter(
      (item) => item
    ).length;

    const result = Math.trunc((simplifiedPoints / total) * 100);
    return `${result}% less`;
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
    fetch('/download')
    .then(response => response.blob())
    .then(blob => {
        // Use the file-saver package to trigger a download
        FileSaver.saveAs(blob, context.data.new_file_name);
    });
}

  return (
    <div className="font-sans min-h-screen relative overflow-hidden bg-sky-50/50">
      <div className="max-w-7xl container z-1">
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
          <div className="bg-white shadow-lg pt-8 pb-12 px-16 rounded-3xl">
            <Chart data={context.data} />
          </div>
        )}

        <div className="relative mt-[100px]">
          <div className="absolute w-[350%] -move-infinite -zanimate-1 left-0">
            <img
              src="/images/line-2.png"
              alt="infinity line"
              className="h-[180px] w-[350%]"
            />
          </div>
          <div className="text-center flex items-center flex-col relative z-2">
            <h2 className="mt-6 text-4xl text-gray-800 font-medium">
              Compare Line Simplification Results
            </h2>
            <p className="text-gray-500 mt-6 font-regular text-xl w-7/12">
              Check out the difference between the original and the simplified
              resulting version of this tool which you can download
            </p>
          </div>
        </div>

        <div className="flex justify-center mt-16 mb-[200px]">
          <table className="table-fixed text-center w-9/12 ">
            <thead className="bg-slate-200 border">
              <tr className="py-6">
                <th className="border"></th>
                <th className="border py-3">Original</th>
                <th className="border">Simplified</th>
                <th className="border">Difference</th>
              </tr>
            </thead>
            <tbody className="text-slate-500 ">
              <Row
                title="No. of data points"
                original={`${context.data.row_2.length}`}
                simplified={`${
                  context.data.row_2_rdp.filter((item) => item).length
                }`}
                difference={`${dataPointsDiff()}`}
              />
              <Row
                title="Mean Value"
                original={`${getMeanVal(context.data.row_2)}`}
                simplified={`${getMeanVal(context.data.row_2_rdp)}`}
                difference="1% MOE"
              />
              <Row
                title="Standard deviation"
                original={`${getStandardDeviation(context.data.row_2)}`}
                simplified={`${getStandardDeviation(context.data.row_2_rdp)}`}
                difference="1% MOE"
              />
              <Row
                title="Running time"
                original={`${context.data.running_time_orig}`}
                simplified={`${context.data.running_time_simp}`}
                difference={`${context.data.running_time_orig - context.data.running_time_simp} faster`}
              />
              <Row
                title="File size"
                original={`${context.data.file_size} ${context.data.file_type}`}
                simplified={`${context.data.new_file_size} ${context.data.new_file_type}`}
                difference={`${context.data.file_size - context.data.new_file_size} ${context.data.new_file_type} less`}
              />
              <tr className="border-b border-slate-200">
                <td className="text-left pl-10 py-5 text-slate-700 font-semibold">
                  File name
                </td>
                <td>{`${context.data.new_file_name}`}</td>
                <td>
                  <button onClick={handleDownload} className="bg-indigo-700 py-2 px-5 rounded-lg text-white font-semibold">
                    Download File
                  </button>
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
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

function Chart({ data }) {
  const context = useContext(LayoutContext);

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: `${context.file?.name}`,
      },
    },
  };

  const labels = data.row_1;

  const settings = {
    labels,
    datasets: [
      {
        label: `Simplified ${data.columns[1]}`,
        data: data.row_2_rdp,
        borderColor: "rgb(79, 70, 229)",
        backgroundColor: "rgba(79, 70, 229, 0.5)",
        spanGaps: true,
      },
      {
        label: `Original ${data.columns[1]}`,
        data: data.row_2,
        borderColor: "rgb(6, 182, 212)",
        backgroundColor: "rgba(6, 182, 212, 0.5)",
      },
    ],
  };

  return <Line options={options} data={settings} />;
}

function Row({ title, original, simplified, difference }) {
  return (
    <tr className="border-b border-slate-200">
      <td className="text-left text-slate-700 pl-10 py-5 font-semibold">
        {title}
      </td>
      <td>{original}</td>
      <td>{simplified}</td>
      <td>{difference}</td>
    </tr>
  );
}
