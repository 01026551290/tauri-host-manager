import { useState, useEffect, ChangeEvent, useContext } from "react";

import { invoke } from "@tauri-apps/api/tauri";

import Box from "@mui/material/Box";
import AppBar from "@mui/material/AppBar";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { ThemeProvider, createTheme } from "@mui/material/styles";

import HostDialog from "./dialog";
import { HostContext } from "../context/host-provider";

function HostContent() {
  const { selectHost, currentHostName, setCurrentHostName, setInit } =
    useContext(HostContext);

  const [defaultHostContext, setDefaultHostContext] = useState<string>("");
  const [hostsContent, setHostsContent] = useState<string>("");
  const [dialogToggle, setDialogToggle] = useState<boolean>(false);
  const [type, setType] = useState<"error" | "success" | "confirm">("error");
  const [msg, setMsg] = useState<string>("");
  const [onConfirmClick, setOnConfirmClick] =
    useState<() => Promise<void> | void | undefined>();
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const customTheme = createTheme({
    palette: {
      mode: "light",
      primary: {
        main: "#F9F8E6",
      },
    },
  });

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

  useEffect(() => {
    const fetchHostsFile = async () => {
      try {
        const content = (await invoke("read_hosts_file")) as string;
        setDefaultHostContext(content);
      } catch (error) {
        setDefaultHostContext("Error loading hosts file.");
      }
    };

    fetchHostsFile();
  }, []);

  const readHostFileHandler = async () => {
    try {
      const content = await invoke<string>("read_host_file", {
        name: selectHost.name,
      });
      setHostsContent(content);
    } catch (error) {
      console.error("Failed to read host file:", error);
    }
  };

  useEffect(() => {
    if (selectHost.id === "init") {
      setHostsContent(defaultHostContext);
    } else {
      readHostFileHandler();
    }
  }, [selectHost, defaultHostContext]);

  const handleTextareaChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setHostsContent(event.target.value);
  };

  const saveHostsFile = async () => {
    if (isSaving) return;
    setIsSaving(true);

    let updatedHostsContent = hostsContent;

    if (!hostsContent.replaceAll(" ", "").includes("127.0.0.1localhost")) {
      updatedHostsContent = "127.0.0.1 localhost\n" + updatedHostsContent;
    }

    if (
      !hostsContent.replaceAll(" ", "").includes("255.255.255.255broadcasthost")
    ) {
      updatedHostsContent =
        "255.255.255.255 broadcasthost\n" + updatedHostsContent;
    }

    if (!hostsContent.replaceAll(" ", "").includes("::1localhost")) {
      updatedHostsContent = "::1 localhost\n" + updatedHostsContent;
    }

    try {
      await invoke("save_host_file", {
        oldname: selectHost.oldName ?? null,
        name: selectHost.name,
        content: updatedHostsContent,
      });
      if (currentHostName === selectHost.oldName) {
        await invoke("save_current_host_name", { name: selectHost.name });
        setCurrentHostName(selectHost.name);
      }
      dialogHandler("success", "파일이 성공적으로 저장되었습니다.", () => {
        setIsSaving(false);
      });
    } catch (error) {
      dialogHandler("error", "파일 저장에 실패했습니다.");
    }
  };

  const applyHostFile = async () => {
    const content = await invoke<string>("read_host_file", {
      name: selectHost.name,
    });

    if (content === "") {
      dialogHandler("error", "저장되지 않았거나 빈 파일은 적용할 수 없습니다.");
      return;
    }

    try {
      await invoke("apply_host_file", { name: selectHost.name });
      dialogHandler("success", "적용되었습니다!", async () => {
        await invoke("save_current_host_name", { name: selectHost.name });
        setCurrentHostName(selectHost.name);
        const content = (await invoke("read_hosts_file")) as string;
        setDefaultHostContext(content);
      });
    } catch (error) {
      console.error("Failed to apply hosts file:", error);
      dialogHandler("error", "적용에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteHostFileHandler = async () => {
    const content = await invoke<string>("read_host_file", {
      name: selectHost.name,
    });

    if (content === "") {
      setInit(false);
      return;
    }

    try {
      await invoke("delete_host_file", { name: selectHost.name });
      dialogHandler("success", "파일이 성공적으로 삭제되었습니다.");
      setInit(false);
    } catch (error) {
      dialogHandler("error", "파일 삭제에 실패했습니다.");
    }
  };

  const deleteHostFile = async () => {
    if (currentHostName === selectHost.name) {
      dialogHandler("error", "현재 선택된 호스트파일은 삭제할 수 없습니다.");
      return;
    }
    dialogHandler(
      "confirm",
      "해당 호스트파일을 삭제하시겠습니까?",
      deleteHostFileHandler
    );
  };

  return (
    <>
      <Box
        sx={{
          width: "100%",
          maxWidth: "100%",
          bgcolor: "background.paper",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {selectHost.id !== "init" && (
          <ThemeProvider theme={customTheme}>
            <AppBar position="static">
              <Stack direction="row" spacing={2} padding={"1rem"}>
                <Button variant="contained" onClick={applyHostFile}>
                  적용
                </Button>
                <Button variant="contained" onClick={saveHostsFile}>
                  저장
                </Button>
                <Button variant="contained" onClick={deleteHostFile}>
                  제거
                </Button>
              </Stack>
            </AppBar>
          </ThemeProvider>
        )}

        <Box
          sx={{
            flexGrow: 1,
            overflowY: "auto",
            maxHeight: "calc(100vh - 68px)",
            display: "flex",
          }}
        >
          <TextField
            aria-label="minimum height"
            minRows={30}
            style={{
              width: "100%",
              maxHeight: "100%",
              boxSizing: "border-box",
              overflowY: "auto",
              overflowX: "hidden",
            }}
            multiline
            value={hostsContent}
            onChange={handleTextareaChange}
            disabled={selectHost.id === "init"}
          />
        </Box>
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

export default HostContent;
