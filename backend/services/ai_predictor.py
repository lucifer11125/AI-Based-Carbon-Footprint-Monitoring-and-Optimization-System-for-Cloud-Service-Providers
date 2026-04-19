import numpy as np
from sklearn.linear_model import LinearRegression
from sqlalchemy.orm import Session
from models.sql_models import ProcessedMetric, Prediction


MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
               "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def train_and_predict(db: Session, dataset_id: int):
    """Train a regression model on historical carbon data and predict next 3 months."""
    metrics = (
        db.query(ProcessedMetric)
        .filter(ProcessedMetric.dataset_id == dataset_id)
        .order_by(ProcessedMetric.year, ProcessedMetric.month)
        .all()
    )

    # Clear old predictions
    db.query(Prediction).filter(Prediction.dataset_id == dataset_id).delete()
    db.commit()

    if not metrics or len(metrics) < 2:
        return []

    X = np.arange(len(metrics)).reshape(-1, 1)
    y_carbon = np.array([m.total_carbon for m in metrics])

    model = LinearRegression()
    model.fit(X, y_carbon)

    last_idx = len(metrics) - 1
    last_val = metrics[-1].total_carbon
    last_month = metrics[-1].month
    preds = []

    for i in range(1, 4):
        future_x = np.array([[last_idx + i]])
        future_c = float(model.predict(future_x)[0])
        future_c = max(future_c, 0.0)

        diff = future_c - last_val
        if diff > (last_val * 0.05):
            trend = "Increasing"
        elif diff < -(last_val * 0.05):
            trend = "Decreasing"
        else:
            trend = "Stable"

        conf = min(0.95, 0.5 + (len(metrics) * 0.03))
        future_month = ((last_month - 1 + i) % 12)
        month_name = MONTH_NAMES[future_month]

        pred = Prediction(
            dataset_id=dataset_id,
            month_index=last_idx + i,
            month_name=month_name,
            predicted_carbon=round(future_c, 4),
            trend_direction=trend,
            confidence_score=round(conf, 2),
        )
        db.add(pred)
        preds.append(pred)
        last_val = future_c

    db.commit()
    return preds
