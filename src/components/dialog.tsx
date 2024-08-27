import Button from "@mui/material/Button";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Dialog from "@mui/material/Dialog";

interface HostDialogProps {
  type: "error" | "success" | "confirm";
  dialogToggle: boolean;
  msg?: string;
  onCancelClick?: () => void;
  onConfirmClick?: () => void;
  onClose: () => void;
}

export function HostDialog({
  type,
  dialogToggle,
  msg,
  onCancelClick,
  onConfirmClick,
  onClose,
}: HostDialogProps) {
  const handleConfirm = async () => {
    if (onConfirmClick) {
      await onConfirmClick?.();
    }
    onClose();
  };

  const handleCancel = () => {
    if (onCancelClick) {
      onCancelClick?.();
    }
    onClose();
  };

  return (
    <Dialog onClose={onClose} open={dialogToggle}>
      <DialogContent>{msg}</DialogContent>
      <DialogActions>
        {type === "confirm" && <Button onClick={handleCancel}>취소</Button>}
        <Button onClick={handleConfirm} autoFocus>
          확인
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default HostDialog;
