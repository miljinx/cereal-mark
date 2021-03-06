import { useContext } from "react";
import { FormikValues } from "formik";
import { Format, SeriesItem } from "../types";
import { DEFAULT_ERROR } from "../constants";
import { toUndefined } from "../helpers";
import { SetErrorContext } from "../App";
import ModalForm from "./ModalForm";
import { EditSeriesForm } from "../forms";

type Props = {
  seriesItem: SeriesItem;
  isOpen: boolean;
  onClose: () => void;
  editSeries: (
    oldTitle: string,
    title: string,
    format: Format,
    viewUrl: string | undefined,
    archived: boolean,
    complete: boolean,
    favorite: boolean
  ) => void;
  deleteSeries: (title: string) => void;
  seriesExists: (title: string | undefined, ownTitle?: string) => boolean;
};

function EditSeriesView({
  seriesItem,
  isOpen,
  onClose,
  editSeries,
  deleteSeries,
  seriesExists,
}: Props) {
  const setError = useContext(SetErrorContext);

  const onSubmit = (values: FormikValues): void => {
    setError(undefined);
    try {
      if (values.willDelete) {
        deleteSeries(seriesItem.title);
      } else {
        editSeries(
          seriesItem.title,
          values.title,
          values.format,
          toUndefined(values.viewUrl),
          values.archived,
          values.complete,
          values.favorite
        );
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : DEFAULT_ERROR);
    }
  };

  return (
    <ModalForm header="Edit Series" isOpen={isOpen} handleClose={onClose}>
      <EditSeriesForm
        seriesItem={seriesItem}
        handleSubmit={onSubmit}
        seriesExists={seriesExists}
        handleCancel={onClose}
        modalFooter={true}
      />
    </ModalForm>
  );
}

export default EditSeriesView;
