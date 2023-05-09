import os
import time
import math
import numpy as np
from rdp import rdp     # comment this line of code if you want to try the rdp code from scratch
import pandas as pd
from typing import List
from scipy.stats import wilcoxon
from scipy.stats import ttest_ind
from concurrent.futures import ThreadPoolExecutor
from flask import Flask, jsonify, request, send_file

app = Flask(__name__)

# Set the maximum allowed request size to 100 GB
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024 * 1024

executor = ThreadPoolExecutor(4) 

# rdp code from scratch
"""
def rdp(points, epsilon):
    dmax = 0
    index = 0
    for i in range(1, len(points) - 1):
        d = perpendicular_distance(points[i], points[0], points[-1])
        if d > dmax:
            index = i
            dmax = d
    if dmax > epsilon:
        results = rdp(points[:index+1], epsilon)[:-1] + rdp(points[index:], epsilon)
    else:
        results = [points[0], points[-1]]
    return results

def perpendicular_distance(point, start, end):
    x, y = point
    x1, y1 = start
    x2, y2 = end
    nom = abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1)
    denom = ((y2 - y1)**2 + (x2 - x1)**2)**0.5
    return nom/denom
"""
def find_optimal_chunk_size(data):
    """
    Returns the number of chunks that the points will be divided to be processed in a parallel way
    """
    len_data = len(data)
    if len_data <= 100:
        return 2
    elif len_data > 100 and len_data <= 1000:
        return 4
    elif len_data > 1000 and len_data <= 10000:
        return 16
    elif len_data > 10000 and len_data <= 100000:
        return 32
    elif len_data > 100000:
        return 64

# this function contains just a classic RDP algorithm
def classic_rdp(points, eps):
    """
    Returns the classic rdp result
    """
    res = rdp(points, epsilon=eps)
    return res


def parallel_rdp(points, eps):
    """
    Returns the rdp result for every chunk
    """
    future = executor.submit(rdp, points, epsilon=eps)
    result = future.result()
    return result


def parallel_rdp_algorithm(data: List[List[float]], epsilon: float, chunk_size: int = None) -> List[List[float]]:
    """
    This is the function where the process of running all the chunks of the original line will happen in a parallel way through the use of multiprocessing's threadpoolexecutor
    """

    # Create a thread pool with four threads
    executor = ThreadPoolExecutor(4)

    # Divide the data into chunks of size chunk_size (if specified)
    if chunk_size:
        data_chunks = [data[i:i+chunk_size]
                       for i in range(0, len(data), chunk_size)]
    else:
        data_chunks = [data]

    # Submit each chunk to the thread pool
    futures = [executor.submit(parallel_rdp, chunk, epsilon)
               for chunk in data_chunks]

    # Wait for all threads to finish and collect the results
    results = [future.result() for future in futures]

    # Concatenate the results into a single list
    return [point for sublist in results for point in sublist]

def checkFastRuntime(classic_runtime, parallel_runtime):
    # compare the two running times using wilcoxon
    p_value = wilcoxon([classic_runtime, parallel_runtime]).pvalue

    # check if the running of the RDP algorithm with CPU Parallelism is faster than the classic RDP
    if(parallel_runtime<classic_runtime):
        print("The RDP algorithm with parallelized RDP is faster")
    else:
        print("The classic RDP algorithm is faster")

    # check if p_value is lower than the default significant level 0.05
    # if TRUE, it is statistically significant, if FALSE, it is not statistically significant
    if p_value < 0.05:
        print(f"It is statistically significant. P_Value: {p_value}\n")
    else:
        print(f"It is NOT statistically significant. P_Value: {p_value}\n")

# this function is for creating new CSV file for the simplified original CSV file
def createNewCSV(file, file_size, paralValue, df, return_val):
    global simplified_file
    filename = file.filename
    df_simplified = pd.DataFrame(paralValue, columns=[df.columns[0],df.columns[1]])

    # save the created file to the folder name: simplified-files
    directory_path = 'simplified-files'
    if not os.path.exists(directory_path):
        os.makedirs(directory_path)
    simplified_file = os.path.join(directory_path, filename.split('.')[0]+'(simplified).csv')
    df_simplified.to_csv(simplified_file, index=False)

    # get the size of the new file and its file size type
    new_file_size = os.path.getsize(simplified_file)
    new_file_type= convert_bytes(new_file_size)

    # get the size of the difference file and its file size type
    diff_file_size = file_size - new_file_size
    diff_file_type = convert_bytes(diff_file_size)

    # remove the 'simplified-files\' string from the new_filename 'simplified-files\<file_name>(simplified).csv'
    new_filename = simplified_file.replace('simplified-files\\', '')

    return_val.update({
        "new_file_name": new_filename,
        "new_file_size": new_file_size,
        "new_file_type": new_file_type,
    })

# this function is for getting file size label
def convert_bytes(num):
    if num >= 1024*1024:
        size_mb = num/(1024*1024)
        return f'{size_mb:.2f} MB'
    else:
        size_kb = num/1024
        return f'{size_kb:.2f} KB'

# this function is for getting dynamic epsilon value
def dynamic_epsilon(data):
    """
    Find an epsilon value for Ramer-Douglas-Peucker line simplification
    based on the median absolute deviation (MAD) of the data.
    """
    time_interval = 1  # determines the intensity of the change (1 = 100% maximum value for the best epsilon, 0.5 = 50%, 0.1 = 10%)
    mad = np.median(np.abs(data - np.median(data)))  # MAD
    data_range = np.max(data) - np.min(data)  # range of the data
    # multiplying the average of the MAD and range to the intensity of change to get the epsilon
    epsilon = (mad + data_range) / 2 * time_interval
    return epsilon

#simplify
@app.route('/api/simplify', methods = ['POST'])
def trigger():
    return_val = {}

    try:
        # get file from api call
        file = request.files['file']

        # get the file size and its label
        file_size = os.fstat(file.fileno()).st_size
        file_type = convert_bytes(file_size)

        # read file using pandas
        df = pd.DataFrame()
        chunksize = 100
        for chunk in pd.read_csv(file.stream, delimiter=',', chunksize=chunksize):
            df = pd.concat([df, chunk])

        cols = df.columns.values.tolist()
        first_row = df.iloc[:, 0]
        second_row = df.iloc[:, 1].astype(float)

        # list rows
        list_row_1 = first_row.values.tolist()
        list_row_2 = second_row.values.tolist()

        points = np.column_stack([range(len(first_row)), second_row])

        # get dynamic epsilon value
        eps = dynamic_epsilon([p[1] for p in points])

        # edit here
        # change chunk size
        chunk = find_optimal_chunk_size(points)

        # parallel results
        # get running time for rdp with CPU Parallelism
        start_time = time.time() 
        tempRDP = parallel_rdp_algorithm(points, eps, chunk)
        end_time = time.time()
        parallel_runtime = end_time - start_time

        first_row_rdp = [list_row_1[int(item[0])] for item in tempRDP]
        second_row_rdp = [list_row_2[int(item[0])] for item in tempRDP]
        paralValue = np.column_stack([first_row_rdp,second_row_rdp])    # stacks the new first and second row for the simplified data

        list_row_1_rdp = []
        list_row_2_rdp = []

        counter = 0
        for item in first_row:
            if item in first_row_rdp:
                list_row_1_rdp.append(item)
                list_row_2_rdp.append(second_row[counter])
            else:
                list_row_1_rdp.append(None)
                list_row_2_rdp.append(None)
            counter += 1

        # classic results
        # get running time for classic rdp    
        start_time = time.time() 
        tempClassic = rdp(points, epsilon=eps)
        end_time = time.time()
        classic_runtime = end_time - start_time

        list_of_lists = [[float(val) for val in row] for row in tempClassic]
        first_row_rdp_classic = [list_row_1[int(item[0])] for item in list_of_lists]
        second_row_rdp_classic = [list_row_2[int(item[0])] for item in list_of_lists]

        list_row_1_rdp_classic = []
        list_row_2_rdp_classic = []

        counter2 = 0
        for item in first_row:
            if item in first_row_rdp_classic:
                list_row_1_rdp_classic.append(item)
                list_row_2_rdp_classic.append(second_row[counter2])
            else:
                list_row_1_rdp_classic.append(None)
                list_row_2_rdp_classic.append(None)
            counter2 += 1
        
        # t-test
        # remove the none values
        cleaned_list_rdp = [x for x in list_row_2_rdp if x is not None]
        # perform the t-test
        t, p = ttest_ind(list_row_2, cleaned_list_rdp)

        # row_2 = points before rdp
        # row_2_rdp = points after rdp with null values
        return_val.update({
            "columns": cols,
            "row_1": list_row_1,
            "row_2": list_row_2,
            "row_1_rdp": list_row_1_rdp,
            "row_2_rdp": list_row_2_rdp,
            "file_type": file_type,
            "file_size": file_size,
            "epsilon" : eps,
            "t_statistic": t,
            "p_value": p,
            "parallel_runtime": parallel_runtime,
        })
        
        # print(list_row_2)
        # get the running of classic_rdp and approx_poly
        checkFastRuntime(classic_runtime, parallel_runtime)

        # write the simplified dataframe to a new csv file
        createNewCSV(file, file_size, paralValue, df, return_val)
        
        return return_val

    # Catch error if the CSV file is not a valid time series dataset
    except TypeError as e:
        return jsonify({'message': str(e)}), 400
    
    # Catch error if the uploaded CSV file is empty
    except pd.errors.EmptyDataError:
        return jsonify({'message': 'CSV file is empty!'}), 400

    # Catch any type of errors
    except Exception as e:
        return jsonify({'message': str(e)}), 400
    
@app.route('/download')
def download():
    # send the newly created csv file to the react client
    return send_file(simplified_file, as_attachment=True)

#members api route
@app.route("/members")

def members():
    return {"members": ["Member1", "Member2", "Member3"]}

if __name__ == "__main__":
    app.run(debug=True)