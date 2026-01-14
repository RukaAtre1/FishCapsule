const http = require('http');

const syllabusText = `Week Day Topic Assignments
0 9/25 Python Essentials Lab 0: Intro to Python
9/26 Discussion: Lab 0 numpy, graphing, Jupyter Notebooks
1 9/30 Introduction
10/2 Data Collection and Cleaning Lab 1: sklearn, matplotlib
10/3 Discussion: Python and Project Teams Team contracts due
2 10/7 Linear Regression
10/9 Multiple and Polynomial Regression Lab 2 : Scikit-learn Linear Regression
10/10 Discussion: Lab 2 and Project Data Project Data Check-in due, PS1 posted
3 10/14 Model Selection and Cross Validation (CV)
10/16 Regularization and Hypothesis Testing Lab 3: Regression and CV
10/17 Discussion: Lab 3 and Project Regression Project Regression Check-in due
4 10/21 Logistic Regression (LR) PS1 due, PS2 posted
10/23 Classification Lab 4: Logistic Regression
10/24 Discussion: Lab 4 Project LR Check-in due
5 10/28 Decision Trees and Random Forests PS2 due
10/30 Midterm Review PS 3 posted
Lab 5: KNN Classification
10/31 Discussion: Lab 5, review Project Classification Check-in due
6 11/4 Midterm Exam
11/6 Dimensionality Reduction Lab 6: PCA
11/7 Discussion: Lab 6 PS4 posted
7 11/11 No class: Veterans Day
11/13 Clustering PS3 due
11/14 Discussion: Unsupervised Learning (UL) Project UL Check-in due
8 11/18 Intro & Training Neural Networks (NN)
11/20 NN Applications: Text and Image Lab 7: NN
11/21 Discussion: NN PS4 due, PS5 posted
9 11/25 Data Science Career Day!
11/27 No class: Thanksgiving Holiday
10 12/2 Neural Networks and Interpretability
12/4 Final Exam Review PS5 due
12/5 Discussion: Project NN Project NN Check-In due`;

const data = JSON.stringify({
    courseTitle: "CS148",
    syllabusText: syllabusText
});

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/outline',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
    res.setEncoding('utf8');
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        console.log('BODY: ' + body);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
