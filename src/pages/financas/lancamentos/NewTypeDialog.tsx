import { FC, FormEvent, ReactNode } from 'react';
import { Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';

interface Props {
  title: string;
  open: boolean;
  onClose: () => void;
  name: string;
  onName: (value: string) => void;
  loading: boolean;
  onSubmit: (event: FormEvent) => void;
  /** Campos próprios do tipo (categoria 50/30/20 na despesa, flags de contagem na receita). */
  children?: ReactNode;
}

/** Diálogo "Novo Tipo de ...": o nome é comum; o que mais o tipo pede entra como `children`. */
const NewTypeDialog: FC<Props> = ({ title, open, onClose, name, onName, loading, onSubmit, children }) => (
  <Dialog open={open} onClose={onClose}>
    <form onSubmit={onSubmit}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <TextField autoFocus fullWidth label="Nome do Tipo" value={name} onChange={(e) => onName(e.target.value)} required margin="dense" />
        {children}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button type="submit" variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={24} /> : 'Salvar'}
        </Button>
      </DialogActions>
    </form>
  </Dialog>
);

export default NewTypeDialog;
