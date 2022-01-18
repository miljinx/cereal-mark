import { useContext } from "react";
import { SetErrorContext } from "../App";
import { Format } from "../types";
import { FORMAT } from "../constants";
import { useInput } from "../hooks";

type Props = {
  clearAddSeriesForm: () => void;
  addSeries: (
    title: string,
    format: Format,
    act: number,
    saga: number | undefined,
    viewUrl: string | undefined
  ) => void;
};

function AddSeriesView({ clearAddSeriesForm, addSeries }: Props) {
  const setError = useContext(SetErrorContext);
  const [name, resetName, bindName] = useInput("");
  const [format, resetFormat, bindFormat] = useInput("SHOW");
  // workaround for https://github.com/facebook/react/issues/6222#issuecomment-194061477
  const [saga, resetSaga, bindSaga] = useInput("");
  const [act, resetAct, bindAct] = useInput(1);
  const [newViewUrl, resetViewUrl, bindViewUrl] = useInput("");

  // TODO: necessary to reset values? this component gets unmounted on save/cancel
  const resetNewSeries = (): void => {
    setError(undefined);
    clearAddSeriesForm();
    resetName();
    resetFormat();
    resetSaga();
    resetAct();
    resetViewUrl();
  };

  const saveSeries = (): void => {
    if (name.length === 0) return;
    try {
      addSeries(
        name,
        format,
        Number(act),
        saga.length === 0 ? undefined : Number(saga),
        newViewUrl.length === 0 ? undefined : encodeURI(newViewUrl.trim())
      );
      resetNewSeries();
    } catch (err) {
      setError(err instanceof Error ? err.message : JSON.stringify(err));
    }
  };

  return (
    <div className="form-container">
      <h2>Add New Series</h2>
      <div>
        <label>
          Name
          <input autoFocus type="text" {...bindName} />
        </label>
      </div>
      <div>
        <label>
          Format
          <select {...bindFormat}>
            <option value="SHOW">{FORMAT.SHOW.NAME}</option>
            <option value="COMIC">{FORMAT.COMIC.NAME}</option>
            <option value="BOOK">{FORMAT.BOOK.NAME}</option>
          </select>
        </label>
      </div>
      <div>
        <label>
          {FORMAT[format as Format].SAGA}
          <input id="act" type="number" min="1" {...bindSaga} />
        </label>
      </div>
      <div>
        <label>
          {FORMAT[format as Format].ACT}
          <input type="number" min="1" {...bindAct} />
        </label>
      </div>
      <div>
        <label>
          Link
          <input
            type="url"
            placeholder="https://example.com"
            pattern="https://.*"
            {...bindViewUrl}
          />
        </label>
      </div>
      <div>
        <button onClick={saveSeries} disabled={name.length === 0}>
          Add
        </button>
        <button onClick={resetNewSeries}>Cancel</button>
      </div>
    </div>
  );
}

export default AddSeriesView;
