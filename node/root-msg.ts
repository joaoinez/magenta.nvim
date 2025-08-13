import type {
  EditPredictionMsg,
  EditPredictionId,
} from "./edit-prediction/edit-prediction-controller.ts";

export type EditPredictionRootMsg = {
  type: "edit-prediction-msg";
  id: EditPredictionId;
  msg: EditPredictionMsg;
};

export type RootMsg = EditPredictionRootMsg;
