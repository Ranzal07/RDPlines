
from flask import Flask, request, send_file
from concurrent.futures import ThreadPoolExecutor
import pandas as pd
import numpy as np
import time
import os
#from scipy.stats import wilcoxon
from rdp import rdp     # comment this line of code if you want to try the real code of rdp

app = Flask(__name__)

# real code for rdp without parallel_rdp
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

# this function contains just a normal RDP
def single_rdp(points, eps):
    single_rdp = rdp(points, epsilon=eps)    
    return single_rdp

# this function contains the cpu parallelized of RDP
def parallel_rdp(points, eps):
    executor = ThreadPoolExecutor(max_workers=20)
    parallel_rdp = executor.submit(rdp, points, eps)
    executor.shutdown(wait=False)
    return parallel_rdp.result()

def getRunningTime(points, eps, return_val):
    # get running time for rdp with no cpu parallelism    
    start_time = time.perf_counter() 
    single_rdp(points,eps)
    end_time = time.perf_counter()
    running_time_orig = end_time - start_time
    return_val.update({"running_time_orig": running_time_orig})

    # get running time for rdp with cpu parallelism   
    start_time = time.perf_counter() 
    parallel_rdp(points, eps)
    end_time = time.perf_counter()
    running_time_simp = end_time - start_time
    return_val.update({"running_time_simp": running_time_simp})

def createNewCSV(file, paral_value, df, return_val):
    global new_filename
    filename = file.filename
    df_simplified = pd.DataFrame(paral_value, columns=[df.columns[0],df.columns[1]])
    new_filename = filename.split('.')[0]+'(simplified).csv'    
    df_simplified.to_csv(new_filename, index=False)
    new_file_size = os.path.getsize(new_filename)
    new_file_type= convert_bytes(new_file_size)

    return_val.update({
        "new_file_name": new_filename,
        "new_file_size": new_file_size,
        "new_file_type": new_file_type,
    })

def convert_bytes(num):
    for x in ['bytes', 'KB', 'MB', 'GB', 'TB']:
        if num < 1024.0:
            return "%s" % (x)

#simplify
@app.route('/api/simplify', methods = ['POST'])
def trigger():
    return_val = {}

    # get file from api call
    file = request.files['file']
    file_size = os.fstat(file.fileno()).st_size
    file_type= convert_bytes(file_size)

    # read file using pandas
    df = pd.read_csv(file.stream, delimiter=',')

    # take the columns and rows
    cols = df.columns.values.tolist()
    first_row = df.iloc[:, 0]
    second_row = df.iloc[:, 1]

    # get automatic epsilon base on data set size
    data_set_size = len(first_row)
    eps = data_set_size * 0.05

    # list rows
    list_row_1 = first_row.values.tolist()
    list_row_2 = second_row.values.tolist()

    points = np.column_stack([first_row.index, second_row])

    paral_value = parallel_rdp(points,eps)  # get the simplified points from the parallel_rdp
    first_row_rdp = [list_row_1[int(item[0])] for item in paral_value]
    second_row_rdp = [item[1] for item in paral_value]

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
    })

    # get the running of single_rdp and parallel_rdp
    getRunningTime(points,eps,return_val)

    # write the simplified dataframe to a new csv file
    createNewCSV(file, paral_value, df, return_val)
    
    return return_val

@app.route('/download')
def download():
    # send the newly created csv file to the react client
    return send_file(new_filename, as_attachment=True)

#members api route
@app.route("/members")

def members():
    return {"members": ["Member1", "Member2", "Member3"]}

if __name__ == "__main__":
    app.run(debug=True)