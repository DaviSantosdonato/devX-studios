import { DialogRoot, Dialog, DialogButton, DialogDescription, DialogTitle } from '~/components/ui/Dialog';
import { ModelSelector } from '~/components/ui/ModelSelector';
import { ThemeSwitch } from '~/components/ui/ThemeSwitch';
import { useStore } from '@nanostores/react';
import { themeStore } from '~/lib/stores/theme';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const theme = useStore(themeStore);

  return (
    <DialogRoot open={open} onOpenChange={onClose}>
      <Dialog onBackdrop={onClose} onClose={onClose}>
        <DialogTitle>Settings</DialogTitle>
        <DialogDescription>Manage your AI model preferences and appearance settings.</DialogDescription>

        <div className="px-5 py-4 space-y-6">
          {/* AI Model Section */}
          <section className="space-y-3">
            <h3 className="devx-type-label text-devx-elements-textPrimary">AI Model</h3>
            <p className="devx-type-caption text-devx-elements-textTertiary">
              Select the AI model to use for chat completions.
            </p>
            <ModelSelector showProvider={true} ariaLabel="Select AI model" disabled={false} />
          </section>

          <div className="devx-divider" />

          {/* Appearance Section */}
          <section className="space-y-3">
            <h3 className="devx-type-label text-devx-elements-textPrimary">Appearance</h3>
            <p className="devx-type-caption text-devx-elements-textTertiary">Choose your preferred color theme.</p>
            <div className="flex items-center gap-3">
              <ThemeSwitch />
              <span className="devx-type-body-small text-devx-elements-textSecondary">
                {theme === 'dark' ? 'Dark mode' : 'Light mode'}
              </span>
            </div>
          </section>
        </div>

        <div className="flex justify-end gap-2 bg-devx-elements-bg-depth-2 px-5 pb-4">
          <DialogButton type="secondary" onClick={onClose}>
            Close
          </DialogButton>
        </div>
      </Dialog>
    </DialogRoot>
  );
}
