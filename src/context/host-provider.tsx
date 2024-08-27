import {
  createContext,
  useState,
  ReactNode,
  Dispatch,
  SetStateAction,
} from "react";

import { ISelectHost } from "../interface/host.interface";

interface IDefaultHostContext {
  init: boolean;
  selectHost: ISelectHost;
  currentHostName: string;
  setSelectHost: Dispatch<SetStateAction<ISelectHost>>;
  setCurrentHostName: Dispatch<SetStateAction<string>>;
  setInit: Dispatch<SetStateAction<boolean>>;
}

export const defaultHostContext: IDefaultHostContext = {
  selectHost: { id: "init", name: "current", toggle: true, isEditing: false },
  currentHostName: "",
  init: false,
  setSelectHost: () => {},
  setCurrentHostName: () => {},
  setInit: () => {},
};

export const HostContext = createContext(defaultHostContext);

interface HostProviderProps {
  children: ReactNode;
}

export const HostProvider = ({ children }: HostProviderProps) => {
  const [selectHost, setSelectHost] = useState<ISelectHost>(
    defaultHostContext.selectHost
  );
  const [currentHostName, setCurrentHostName] = useState<string>(
    defaultHostContext.currentHostName
  );

  const [init, setInit] = useState<boolean>(defaultHostContext.init);

  return (
    <HostContext.Provider
      value={{
        selectHost,
        setSelectHost,
        currentHostName,
        setCurrentHostName,
        init,
        setInit,
      }}
    >
      {children}
    </HostContext.Provider>
  );
};
