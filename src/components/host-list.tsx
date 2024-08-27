import {
  useEffect,
  useState,
  MouseEvent,
  KeyboardEvent,
  ChangeEvent,
  useRef,
  useContext,
} from "react";

import { invoke } from "@tauri-apps/api/tauri";

import Box from "@mui/material/Box";
import List from "@mui/material/List";
import AppBar from "@mui/material/AppBar";
import Button from "@mui/material/Button";
import Switch from "@mui/material/Switch";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import TextField from "@mui/material/TextField";
import { ThemeProvider, createTheme } from "@mui/material/styles";

import { HostContext, defaultHostContext } from "../context/host-provider";

import HostDialog from "./dialog";
import { ISelectHost } from "../interface/host.interface";

function HostList() {
  const {
    selectHost,
    currentHostName,
    init,
    setInit,
    setSelectHost,
    setCurrentHostName,
  } = useContext(HostContext);
  const listRef = useRef<HTMLDivElement>(null);
  const [hostList, setHostList] = useState<ISelectHost[]>([]);

  const [dialogToggle, setDialogToggle] = useState(false);
  const [type, setType] = useState<"error" | "success" | "confirm">("error");
  const [msg, setMsg] = useState("");
  const [onConfirmClick, setOnConfirmClick] =
    useState<() => Promise<void> | void | undefined>();

  useEffect(() => {
    const fetchHostFiles = async () => {
      try {
        if (init) {
          return;
        }
        const files = await invoke<string[]>("list_host_files");
        const hostName = await invoke<string>("read_current_host_name");
        const newHostList = files.map((file: string, index: number) => {
          return {
            id: (index + 1).toString(),
            name: file,
            toggle: file === hostName,
            isEditing: false,
          };
        }) as ISelectHost[];

        setHostList([defaultHostContext.selectHost, ...newHostList]);
        setCurrentHostName(hostName);
        setInit(true);
      } catch (error) {
        console.error("Failed to load host files:", error);
      }
    };

    fetchHostFiles();
  }, [init]);

  useEffect(() => {
    if (currentHostName) {
      const newHostList = hostList.map((host) => {
        return { ...host, toggle: host.name === currentHostName };
      });

      setHostList(newHostList);
    }
  }, [currentHostName]);

  const closeDialog = () => {
    setDialogToggle(false);
    setOnConfirmClick(undefined);
  };

  const dialogHandler = (
    type: "error" | "success" | "confirm",
    msg: string,
    onConfirmClick?: () => Promise<void> | void
  ) => {
    setDialogToggle(true);
    setType(type);
    setMsg(msg);
    setOnConfirmClick(() => async () => {
      if (onConfirmClick) await onConfirmClick();
    });
  };

  const handleListItemClick = (index: string) => {
    const selectedHost = hostList.find((host) => host.id === index);
    setSelectHost(selectedHost ? selectedHost : defaultHostContext.selectHost);
  };

  const handleToggle = (id: string, name: string) => () => {
    dialogHandler(
      "confirm",
      "해당 호스트파일로 적용하시겠습니까?",
      async () => {
        await invoke("apply_host_file", { name: name });
        await invoke("save_current_host_name", { name: selectHost.name });
        const newHostList = hostList.map((host) => {
          return { ...host, toggle: host.id === id ? !host.toggle : false };
        });

        setHostList(newHostList);
        setCurrentHostName(selectHost.name);
      }
    );
  };

  const customTheme = createTheme({
    palette: {
      mode: "light",
      primary: {
        main: "#FF8B8B",
      },
    },
  });

  const addHostHandler = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setHostList((prevHostList) => [
      ...prevHostList,
      {
        id: prevHostList.length.toString(),
        name: "host" + prevHostList.length,
        toggle: false,
        isEditing: true,
      },
    ]);
  };

  const hostKeyDownHandler = (
    e: KeyboardEvent<HTMLInputElement>,
    id: string
  ) => {
    if (e.key === "Enter") {
      const newHostList = hostList.map((host) => {
        if (host.id === id) {
          return {
            ...host,
            isEditing: false,
          };
        }
        return host;
      });

      setHostList(newHostList);
      handleListItemClick(id);
    }
  };

  const hostNameChangeHandler = (
    e: ChangeEvent<HTMLInputElement>,
    id: string
  ) => {
    const newHostList = hostList.map((host) => {
      if (host.id === id) {
        return { ...host, name: e.target.value };
      }
      return host;
    });

    setHostList(newHostList);
  };

  const hostClickHandler = (id: string) => {
    const newHostList = hostList.map((host) => {
      if (host.id === id) {
        return { ...host, isEditing: true, oldName: host.name };
      }
      return host;
    });

    setHostList(newHostList);
  };

  useEffect(() => {
    const handleOutsideClick = (e: Event) => {
      if (listRef.current && !listRef.current.contains(e.target as Node)) {
        const newHostList = hostList.map((host) => {
          return { ...host, isEditing: false };
        });
        setHostList(newHostList);
      }
    };

    document.addEventListener("click", handleOutsideClick);

    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [hostList]);

  return (
    <>
      <Box sx={{ width: "100%", maxWidth: 360, bgcolor: "background.paper" }}>
        <ThemeProvider theme={customTheme}>
          <AppBar position="static" color="primary">
            <Button variant="contained" onClick={addHostHandler}>
              추가
            </Button>
          </AppBar>
        </ThemeProvider>

        <List component="nav" aria-label="main mailbox folders" ref={listRef}>
          {hostList.map((host) => (
            <ListItemButton
              selected={selectHost.id === String(host.id)}
              onClick={() => handleListItemClick(host.id)}
              key={host.id}
            >
              {host.isEditing ? (
                <TextField
                  fullWidth
                  value={host.name}
                  onKeyDown={(e: KeyboardEvent<HTMLInputElement>) =>
                    hostKeyDownHandler(e, host.id)
                  }
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    hostNameChangeHandler(e, host.id)
                  }
                />
              ) : (
                <>
                  <ListItemText
                    primary={host.name}
                    onDoubleClick={() => {
                      hostClickHandler(host.id);
                    }}
                  />
                  {host.id !== "init" && (
                    <Switch
                      edge="end"
                      onChange={handleToggle(host.id, host.name)}
                      checked={host.toggle}
                      inputProps={{
                        "aria-labelledby": "switch-list-label-wifi",
                      }}
                    />
                  )}
                </>
              )}
            </ListItemButton>
          ))}
        </List>
      </Box>
      <HostDialog
        dialogToggle={dialogToggle}
        type={type}
        msg={msg}
        onConfirmClick={onConfirmClick}
        onClose={closeDialog}
      />
    </>
  );
}

export default HostList;
