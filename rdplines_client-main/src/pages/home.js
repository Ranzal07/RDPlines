import React, { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";
import { Circles } from "react-loader-spinner";
import { MdPause } from "react-icons/md";
import { ImCross } from "react-icons/im";
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const Home = () => {
  const borderColor = "rgb(6, 182, 212)";
  const backgroundColor = "rgba(6, 182, 212, 0.5)";

  const context = useContext(LayoutContext);

  const [fileDrag, setFileDrag] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (context.data != null) {
      context.setLabels(context.data.row_1);
      context.setInfo({
        labels: context.data.row_1,
        datasets: [
          {
            label: `Original ${context.data.columns[1]}`,
            data: context.data.row_2,
            borderColor,
            backgroundColor,
            borderWidth: 1,
            pointRadius: 0,
          },
        ],
      });
      context.setOptions({
        responsive: true,
        plugins: {
          legend: {
            position: "top",
          },
          title: {
            display: true,
            text: context.file.name,
          },
        },
      });
    }
  },);

  const handleDragOver = (e) => {
    e.preventDefault();
    setFileDrag(true);
    e.stopPropagation();
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setFileDrag(false);
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setFileDrag(false);

    let files = [...e.dataTransfer.files];

    console.log(files[0]);

    if (files.length > 1) {
      toast.error("Drop 1 file only!", {
        position: "top-right",
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",
      });
    } else {
      if (files[0].type !== "text/csv") {
        toast.error("CSV files only!", {
          position: "top-right",
          autoClose: 4000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "light",
        });
      } else {
        context.setFile(files[0]);
        const formData = new FormData();
        formData.append("file", files[0]);

        setLoading(true);

        axios
          .post("/api/simplify", formData)
          .then((res) => {
            setLoading(false);
            context.setData(res.data);
            console.log(res.data);
          })
          .catch((err) => {
            toast.error("Error uploading! Try again.", {
              position: "top-right",
              autoClose: 4000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              progress: undefined,
              theme: "light",
            });
            setLoading(false);
          });
      }
    }
  };

  const handleBrowseFile = (e) => {
    const inputFile = e.target.files[0];

    context.setFile(inputFile);
    const formData = new FormData();
    formData.append("file", inputFile);

    setLoading(true);

    axios
      .post("/api/simplify", formData)
      .then((res) => {
        setLoading(false);
        context.setData(res.data);
        console.log(res.data);
      })
      .catch((err) => {
        toast.error(err.response.data.message, {
          position: "top-right",
          autoClose: 4000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "light",
        });
        setLoading(false);
      });

    e.target.value = null;
  };

  const handleCancel = () => {
    context.setData(null);
  };

  return (
    <div className="font-sans min-h-screen bg-sky-50/50">
      <img
        src="/images/blob-1.png"
        alt="blob 1"
        className="fixed animate-spin-slow -top-[800px] -left-[45vw] 2xl:-left-[30vw] -z-1"
      />
      <img
        src="/images/blob-2.png"
        alt="blob 2"
        className="fixed animate-spin-slow -top-[1100px] -right-[65vw] 2xl:-right-[30vw] -z-1"
      />
      <img
        src="/images/blob-3.png"
        alt="blob 3"
        className="fixed animate-spin-slow -bottom-[1000px] -right-[35vw] 2xl:-right-[20vw] -z-1"
      />

      <div className="max-w-7xl container relative z-1">
        <nav className="flex justify-center py-12">
          <img src="/images/logo.png" alt="" className="h-14" />
        </nav>

        <div className="mt-20 flex justify-around">
          <div className="w-[490px]">
            <h1 className="text-indigo-800 font-bold text-[64px]">
              Time Series Line Simplification Generator
            </h1>
            <p className="text-xl pr-5 pt-8">
              The Ramer-Douglas-Peucker technique is used to visualize time
              series files and eliminate data points from thousands to hundreds
              without losing the data's conclusions.
            </p>
          </div>

          <div>
            <div className="bg-white p-12 w-[560px] h-[470px] rounded-3xl shadow-xl">
              {loading ? (
                <div className="flex flex-col h-full justify-center">
                  <div className="flex items-center justify-around">
                    <button className="w-14 h-14 flex justify-center items-center bg-gray-200 rounded-full text-gray-500 text-3xl">
                      <MdPause />
                    </button>
                    <Circles
                      height="170"
                      width="170"
                      color="#4338ca"
                      ariaLabel="circles-loading"
                      wrapperStyle={{}}
                      wrapperClass=""
                      visible={true}
                    />
                    <button className="w-14 h-14 flex justify-center items-center bg-gray-200 rounded-full text-gray-500 text-xl font-bold">
                      <ImCross />
                    </button>
                  </div>

                  <p className="text-xl text-center mt-10">
                    {context.file ? context.file.name : ""}
                  </p>
                </div>
              ) : !loading && context.data == null ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`${
                    fileDrag
                      ? "bg-cyan-50 border-cyan-600"
                      : "bg-white border-indigo-300"
                  } flex justify-center items-center flex-col h-full w-full rounded-2xl border-dashed border-2 `}
                >
                  <h3 className="text-2xl">Drop your CSV File Here</h3>
                  <label
                    htmlFor="file-input"
                    className={`text-xl hover:bg-indigo-100 text-gray-800 mt-8 ${
                      fileDrag ? "border-cyan-600" : "border-indigo-600"
                    } border rounded-xl py-2 px-14 cursor-pointer`}
                  >
                    Browse Files
                  </label>
                  <input
                    type="file"
                    name="file-input"
                    id="file-input"
                    accept=".csv, text/csv"
                    className="hidden"
                    onChange={handleBrowseFile}
                    onClick={(e) => {
                      e.target.value = null;
                    }}
                  />
                </div>
              ) : (
                <div className="h-full flex flex-col justify-around">
                  <Line options={context.options} data={context.info} />
                  <div className="flex justify-center mb-3">
                    <button
                      className="bg-cyan-100 text-indigo-800 font-semibold text-xl py-3 px-12 rounded-xl mr-4"
                      onClick={handleCancel}
                    >
                      Cancel
                    </button>
                    <Link
                      to={`/results`}
                      className="text-white bg-indigo-700 font-semibold text-xl py-3 px-12 rounded-xl"
                    >
                      Simplify
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
