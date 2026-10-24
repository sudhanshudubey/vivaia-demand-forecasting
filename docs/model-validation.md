# Validation and model limitations

This document describes what the committed artifacts support. It is **not** a reproduction of training or backtesting, since the complete training pipeline and underlying transactional data are not present in this repository.

## Stored evaluation setup

- Model routing uses a mean monthly demand threshold of **10 units**.
- Saved segment routing has **397 HIGH** and **103 LOW** segments.
- Backtest results cover **six forward-chaining validation folds** (HIGH fold test months July–December 2025).
- Saved aggregate metric summaries:

| Population | Method | MAE | RMSE | sMAPE |
| --- | --- | ---: | ---: | ---: |
| HIGH | LightGBM | 92.7409 | 549.2823 | 45.5757% |
| LOW | Per-segment baseline | 3.3167 | 4.6455 | 59.7742% |

Source: [`backend/models/backtest_results.json`](../backend/models/backtest_results.json).

**Do not directly compare the two error rows:** HIGH and LOW segment populations have very different scales and different evaluation samples. The saved file contains no matched-segment benchmark showing lift from the hybrid routing policy versus a uniform model.

## Interpretation

- **MAE:** average absolute error in forecasted units on the evaluated set.
- **RMSE:** penalizes unusually large misses more heavily than MAE.
- **sMAPE:** a scale-normalized percentage error, but can be unstable with very small demand and zeros.
- Large variation across folds, and HIGH-segment RMSE much greater than MAE, indicate that a subset of cases has large errors. Segment-level or weighted business metrics would be useful.

## Feature and horizon contract

The committed [feature schema](../backend/models/feature_schema.json) lists **23** model inputs. Its training-window metadata states **2024-04 through 2025-12**. Historical aggregate series extend over an earlier period, so *history coverage* is not necessarily the same as *model training coverage*.

In [the forecasting service](../backend/app/forecasting_service.py), HIGH-segment inference updates calendar features for the target month but retains the latest saved lagged/rolling/price values. It issues a warning and an output note if the target is not exactly one month after the last known feature row.

The application UI can allow selection of later months, but that does not make them validated multi-step forecasts. **Avoid representing those outputs as equally reliable across 2026.**

## What a stronger benchmark should demonstrate

1. Reconstruct a timestamped, leakage-controlled walk-forward pipeline from a permitted dataset.
2. Evaluate LightGBM and baseline methods on **identical segments and forecast months**.
3. Report WAPE or weighted MAE, sMAPE, and per-segment error distributions; include uncertainty intervals where possible.
4. Separate one-step from multi-step forecasts and update features recursively or with a validated direct-horizon method.
5. Document data provenance, use rights, and drift monitoring before using forecasts for operational decisions.

## Responsible use

This is a demonstration of forecasting architecture and deployment. Demand projections do not by themselves establish inventory savings or other commercial outcomes. Review data-access and redistribution rights for aggregated artifacts before public use.
