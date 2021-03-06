import { useState, useEffect, useMemo, createContext } from "react";
import { VStack, useToast } from "@chakra-ui/react";
import { Format, Collection, SeriesItem, Session } from "./types";
import { SAVE_INTERVAL, DEFAULT_ERROR } from "./constants";
import { getCollection, updateCollection, backupCollection } from "./api";
import { useInterval } from "./hooks";
import { toUndefined } from "./helpers";
import demoData from "./demo-data";
import ManageCollection from "./components/ManageCollection";
import SeriesList from "./components/SeriesList";
import Home from "./components/Home";
import LoadingView from "./components/LoadingView";
import ScrollToTopView from "./components/ScrollToTopView";
import InvalidUrlView from "./components/InvalidUrlView";
import Header from "./components/Header";
import Footer from "./components/Footer";

export const SetErrorContext = createContext<any>(null);

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [invalidUrl, setInvalidUrl] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [demoMode, setDemoMode] = useState(false);
  const [collectionId, setCollectionId] = useState<string | undefined>(
    undefined
  );
  const [updatedAtMs, setUpdatedAtMs] = useState<number | undefined>(undefined);
  const [savedAtMs, setSavedAtMs] = useState<number>(Date.now());
  const [compactView, setCompactView] = useState(false);
  const [collectionName, setCollectionName] = useState<string | undefined>(
    undefined
  );
  const [seriesItems, setSeriesItems] = useState<Array<SeriesItem> | undefined>(
    undefined
  );
  const [showScrollButton, setShowScrollButton] = useState(false);
  const collection = useMemo(
    () =>
      !collectionId || !seriesItems || !updatedAtMs
        ? null
        : {
            id: collectionId,
            name: collectionName,
            seriesItems,
            compactView,
            updatedAtMs,
          },
    [collectionId, collectionName, seriesItems, compactView, updatedAtMs]
  );

  const changesSaved = !updatedAtMs || updatedAtMs < savedAtMs;

  const hydrateCollection = (collection: Collection): void => {
    setCollectionId(collection.id);
    setCollectionName(toUndefined(collection.name));
    setSeriesItems(collection.seriesItems);
    setCompactView(collection.compactView);
    setUpdatedAtMs(collection.updatedAtMs);
  };

  const initialize = (): void => {
    setError(undefined);
    const id = window.location.pathname.substring(1);
    if (id.length === 0) {
      setIsLoading(false);
      return;
    }
    if (id === "demo") {
      setIsLoading(false);
      setDemoMode(true);
      hydrateCollection(demoData);
      return;
    }
    // https://www.robinwieruch.de/react-hooks-fetch-data/
    const fetchData = async () => {
      try {
        const response = await getCollection(id);
        const collection = response.Item as Collection;
        if (!collection) {
          setInvalidUrl(true);
          setIsLoading(false);
          return;
        }
        hydrateCollection(collection);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : DEFAULT_ERROR);
        setIsLoading(false);
      }
    };
    fetchData();
  };
  useEffect(initialize, []);

  const backupChanges = (): void => {
    if (demoMode || !collection) return;
    backupCollection(collection);
  };
  useEffect(backupChanges, [demoMode, collection, updatedAtMs]);

  const saveChanges = (): void => {
    if (demoMode || !collection || changesSaved) return;
    updateCollection(collection)
      .then(() => setSavedAtMs(Date.now()))
      .catch(() => setError("Could not save changes."));
  };
  useInterval(saveChanges, SAVE_INTERVAL);

  // warning for unsaved changes
  useEffect(() => {
    const leavePageWarning = (e: BeforeUnloadEvent) => {
      if (!demoMode && collectionId && !changesSaved) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", leavePageWarning);
    return () => window.removeEventListener("beforeunload", leavePageWarning);
  }, [changesSaved, collectionId, demoMode]);

  const errorToast = useToast();
  useEffect(() => {
    if (!error) return;
    errorToast({
      position: "top",
      description: error,
      status: "error",
      duration: 20000,
      isClosable: true,
    });
  }, [error, errorToast]);

  const handleScroll = () => {
    setShowScrollButton(window.pageYOffset > window.innerHeight);
  };
  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const updateCollectionName = (name: string): void => {
    setUpdatedAtMs(Date.now());
    setCollectionName(name);
  };

  // TODO: use context to reduce prop drilling
  const seriesExists = (
    title: string | undefined,
    ownTitle?: string
  ): boolean => {
    if (!title) return true;
    if (ownTitle && ownTitle === title) return false;
    return Boolean(seriesItems?.some((item) => item.title === title));
  };

  const addSeries = (
    title: string,
    format: Format,
    act: number,
    saga: number | undefined,
    viewUrl: string | undefined
  ): void => {
    const existingSeries = seriesItems?.filter(
      (item) => item.title === title
    )[0];
    if (existingSeries) {
      throw new Error("Cannot add series, title already exists");
    }
    setUpdatedAtMs(Date.now());
    const firstSession: Session = {
      saga,
      act,
      createdAtMs: Date.now(),
    };
    setSeriesItems([
      ...(seriesItems || []),
      {
        title: title,
        sessions: [firstSession],
        viewUrl: viewUrl,
        favorite: false,
        archived: false,
        complete: false,
        createdAtMs: Date.now(),
        updatedAtMs: Date.now(),
        format: format,
      },
    ]);
  };

  const editSeries = (
    oldTitle: string,
    title: string,
    format: Format,
    viewUrl: string | undefined,
    archived: boolean,
    complete: boolean,
    favorite: boolean
  ): void => {
    const seriesToEdit = seriesItems?.some((item) => item.title === oldTitle);
    if (!seriesItems || !seriesToEdit) {
      throw new Error("Cannot find the series to edit");
    }
    const existingSeries = seriesItems?.some((item) => item.title === title);
    if (oldTitle !== title && existingSeries) {
      throw new Error("Cannot change series title, title already exists");
    }
    setUpdatedAtMs(Date.now());
    setSeriesItems(
      seriesItems.map((item) =>
        item.title === oldTitle
          ? {
              ...item,
              title,
              format,
              viewUrl,
              archived,
              complete,
              favorite: archived ? false : favorite,
              updatedAtMs: Date.now(),
            }
          : item
      )
    );
  };

  const restoreSeries = (title: string) => {
    const seriesToEdit = seriesItems?.some((item) => item.title === title);
    if (!seriesItems || !seriesToEdit) {
      throw new Error("Cannot find the series to restore");
    }
    setUpdatedAtMs(Date.now());
    setSeriesItems(
      seriesItems.map((item) =>
        item.title === title && item.archived === true
          ? {
              ...item,
              archived: false,
              updatedAtMs: Date.now(),
            }
          : item
      )
    );
  };

  const deleteSeries = (title: string) => {
    const seriesToEdit = seriesItems?.some((item) => item.title === title);
    if (!seriesItems || !seriesToEdit) {
      throw new Error("Cannot find the series to delete");
    }
    setUpdatedAtMs(Date.now());
    setSeriesItems(seriesItems.filter((item) => item.title !== title));
  };

  const addSession = (
    seriesTitle: string,
    act: number,
    saga: number | undefined
  ): void => {
    const seriesItem = seriesItems?.filter(
      (item) => item.title === seriesTitle
    )[0];
    if (!seriesItem) {
      throw new Error("Cannot add session, series does not exist");
    }
    if (!seriesItem.sessions) {
      throw new Error("Cannot add session, sessions array does not exist");
    }
    if (seriesItem.sessions.length === 0) {
      throw new Error("Cannot add session, missing first session");
    }
    setUpdatedAtMs(Date.now());
    const session: Session = {
      saga,
      act,
      createdAtMs: Date.now(),
    };
    setSeriesItems(
      seriesItems.map((item) => {
        if (item.title === seriesTitle) {
          return {
            ...item,
            sessions: [...item.sessions, session],
          };
        }
        return item;
      })
    );
  };

  return (
    <VStack w="100%" spacing={[2, 6]}>
      <Header demoMode={demoMode} />
      {isLoading && <LoadingView />}
      {invalidUrl && <InvalidUrlView />}
      {showScrollButton && (
        <ScrollToTopView scrolltoTop={() => window.scrollTo(0, 0)} />
      )}
      <VStack minH="80vh" w={["100%", "md", "lg"]} px={[2, 2, 0]}>
        {!isLoading && !invalidUrl && (
          <SetErrorContext.Provider value={setError}>
            {seriesItems ? (
              <>
                <ManageCollection
                  compactView={compactView}
                  setCompactView={setCompactView}
                  addSeries={addSeries}
                  seriesExists={seriesExists}
                  collectionName={collectionName}
                  updateCollectionName={updateCollectionName}
                />
                <SeriesList
                  compactView={compactView}
                  seriesItems={seriesItems}
                  restoreSeries={restoreSeries}
                  deleteSeries={deleteSeries}
                  seriesExists={seriesExists}
                  editSeries={editSeries}
                  addSession={addSession}
                />
              </>
            ) : (
              <Home setIsLoading={setIsLoading} />
            )}
          </SetErrorContext.Provider>
        )}
      </VStack>
      <Footer />
    </VStack>
  );
}

export default App;
