from flask import Flask, request, jsonify
from flask_cors import CORS
from sklearn.linear_model import LinearRegression
import numpy as np

app = Flask(__name__)
CORS(app)

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    expenses = data.get('expenses', [])

    if len(expenses) < 2:
        return jsonify({'error': 'Need at least 2 months of data'}), 400

    # X = month numbers, y = expense amounts
    X = np.array(range(len(expenses))).reshape(-1, 1)
    y = np.array(expenses)

    # Train model
    model = LinearRegression()
    model.fit(X, y)

    # Predict next 3 months
    future_months = np.array(range(len(expenses), len(expenses) + 3)).reshape(-1, 1)
    predictions = model.predict(future_months)

    # R squared score
    score = model.score(X, y)

    return jsonify({
        'predictions': predictions.tolist(),
        'r2_score': round(score, 2),
        'slope': round(float(model.coef_[0]), 2),
        'intercept': round(float(model.intercept_), 2)
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)