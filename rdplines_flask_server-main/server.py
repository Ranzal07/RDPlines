
import os
import time
import numpy as np
from rdp import rdp     # comment this line of code if you want to try the rdp code from scratch
import pandas as pd
from scipy.stats import wilcoxon
from scipy.stats import ttest_ind
from multiprocessing import Process, Queue
from skimage.measure import approximate_polygon
from flask import Flask, jsonify, request, send_file

app = Flask(__name__)
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

# this function contains just a classic RDP algorithm
def classic_rdp(points, eps):
    classic_rdp = rdp(points, epsilon=eps)    
    return classic_rdp

# this function contains the RDP algorithm with CPU Parallelism
def queue_rdp(points, eps, queue):
    queue_rdp = rdp(points, epsilon=eps)
    return queue.put(queue_rdp)    

def parallel_rdp(points, eps):
    queue = Queue()
    p = Process(target=queue_rdp, args=(points, eps, queue))
    p.start()
    p.join()
    results = queue.get()
    return results

# this function contains the RDP algorithm with approximate_polygon
def approx_poly(points, eps):
    approx_rdp = approximate_polygon(points, eps)
    return approx_rdp

def getRunningTime(points, eps, return_val):
    for _ in range(10):
        # get running time for classic rdp    
        start_time = time.time() 
        classic_rdp(points, eps)
        end_time = time.time()
        classic_runtime = end_time - start_time
        return_val.update({"classic_runtime": classic_runtime})

        # get running time for rdp with CPU Parallelism
        start_time = time.time() 
        parallel_rdp(points, eps)
        end_time = time.time()
        parallel_runtime = end_time - start_time
        return_val.update({"parallel_runtime": parallel_runtime})

        # compare the two running times using wilcoxon
        p_value = wilcoxon([classic_runtime, parallel_runtime]).pvalue

        # check if the running of the RDP algorithm with CPU Parallelism is faster than the classic RDP
        if parallel_runtime < classic_runtime:
            print("The RDP algorithm with CPU Parallelism is faster")
            print("Parallel RDP RunTime: ", parallel_runtime)
            print("Classic RDP RunTime:  ", classic_runtime)

        else:
            print("The Classic RDP algorithm is faster")
            print("Parallel RDP RunTime: ", parallel_runtime)
            print("Classic RDP RunTime:  ", classic_runtime)

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
        "diff_file_size": diff_file_size,
        "diff_file_type": diff_file_type,
    })

# this function is for getting file size label
def convert_bytes(num):
    for x in ['bytes', 'KB', 'MB', 'GB', 'TB']:
        if num < 1024.0:
            return "%s" % (x)
        num /= 1024.0

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
        df = pd.read_csv(file.stream, delimiter=',')

        # take the columns and rows
        cols = df.columns.values.tolist()
        first_row = df.iloc[:, 0]
        second_row = df.iloc[:, 1]

        # list rows
        list_row_1 = first_row.values.tolist()
        list_row_2 = second_row.values.tolist()

        points = np.column_stack([range(len(first_row)), second_row])

        # get automatic epsilon value
        k = 0.1  # You can adjust this constant factor to tune the level of simplification
        distances = np.abs(np.subtract.outer(points[:, 1], points[:, 1])).flatten()
        stddev = np.std(distances)
        eps = k * stddev

        """eps = np.std(points)*0.05"""

        tempRDP = parallel_rdp(points,eps)  # get the simplified points from the classic_rdp or parallel_rdp

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
        })
        
        # get the running of classic_rdp and parallel_rdp
        getRunningTime(points, eps, return_val)

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