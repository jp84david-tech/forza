import { Download, MoreVertical, Plus, Share, X } from 'lucide-react';
import { useState } from 'react';
import { isIOS, promptInstall, useInstall } from '../lib/install';
import { ui } from '../state/ui';
import { LogoMark } from './icons';
import { SheetBody, SheetHeader } from './Sheet';
import { Row } from './ui';

function Steps({ steps }: { steps: React.ReactNode[] }) {
  return (
    <ol className="install-steps">
      {steps.map((s, i) => (
        <li key={i}>
          <span className="install-steps__n">{i + 1}</span>
          <span>{s}</span>
        </li>
      ))}
    </ol>
  );
}

function InstallSheet({ close }: { close: () => void }) {
  const fromFile = location.protocol === 'file:';
  const ios = isIOS();
  const touch = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
  return (
    <>
      <SheetHeader title="Install BALLS" subtitle="Opens full screen from your home screen, like any other app." onClose={close} />
      <SheetBody>
        {fromFile ? (
          <p className="install-note">
            You’ve opened BALLS from a downloaded file, which can’t be installed. Open the online link instead, then come back here.
          </p>
        ) : ios ? (
          <Steps
            steps={[
              <>
                In Safari, tap <b>Share</b> <Share size={15} className="install-inline" />
              </>,
              <>
                Scroll down and tap <b>Add to Home Screen</b> <Plus size={15} className="install-inline" />
              </>,
              <>
                Tap <b>Add</b>. BALLS appears on your home screen.
              </>,
            ]}
          />
        ) : touch ? (
          <Steps
            steps={[
              <>
                Tap your browser’s menu <MoreVertical size={15} className="install-inline" />
              </>,
              <>
                Tap <b>Install app</b> or <b>Add to Home screen</b>
              </>,
              <>
                Tap <b>Install</b>. BALLS appears with your other apps.
              </>,
            ]}
          />
        ) : (
          <Steps
            steps={[
              <>
                Click the install icon <Download size={15} className="install-inline" /> at the right of the address bar
              </>,
              <>
                Or open the browser menu and choose <b>Install BALLS</b> (Chrome) or <b>Apps → Install this site as an app</b> (Edge)
              </>,
              <>BALLS opens in its own window and appears with your other apps.</>,
            ]}
          />
        )}
      </SheetBody>
    </>
  );
}

/** Show the browser's install box, or instructions where there isn't one. */
export async function openInstall() {
  if (await promptInstall()) return;
  ui.open('Install BALLS', (close) => <InstallSheet close={close} />);
}

/** Settings row. Hidden once installed. */
export function InstallRow() {
  const { installed } = useInstall();
  if (installed) return null;
  return <Row icon={<Download size={18} />} title="Install the app" subtitle="Full screen, with its own icon" onClick={openInstall} />;
}

const HINT_KEY = 'balls.installHint.dismissed';
function hintDismissed() {
  try {
    return localStorage.getItem(HINT_KEY) === '1';
  } catch {
    return false;
  }
}

/** A one-time nudge on phones that can install. */
export function InstallBanner() {
  const { canPrompt, installed } = useInstall();
  const [hidden, setHidden] = useState(hintDismissed);
  const phone = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
  const canInstall = canPrompt || (isIOS() && location.protocol !== 'file:');
  if (hidden || installed || !phone || !canInstall) return null;
  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(HINT_KEY, '1');
    } catch {
      /* per-device hint only */
    }
  };
  return (
    <div className="install-banner">
      <LogoMark size={36} />
      <button type="button" className="install-banner__body" onClick={openInstall}>
        <b>Get the BALLS app</b>
        <span>Add it to your home screen. Free, no app store needed.</span>
      </button>
      <button type="button" className="install-banner__close" onClick={dismiss} aria-label="Dismiss">
        <X size={18} />
      </button>
    </div>
  );
}
