import { useEffect, useState, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrent } from '@tauri-apps/api/window';
import { open } from '@tauri-apps/plugin-shell';
import { debounce } from 'lodash';
import clsx from 'clsx';

import WinTitlebar from '~components/WinTitlebar';
import useInfo from '~hooks/useInfo';
import ReloadIcon from '~icons/Reload';
import ArrowLeftIcon from '~icons/ArrowLeft';
import PinIcon from '~icons/Pin';
import UnPinIcon from '~icons/UnPin';
import LinkIcon from '~icons/Link';
import AskIcon from '~icons/Ask';
import ThemeSystem from '~icons/ThemeSystem';
import ThemeLight from '~icons/ThemeLight';
import ThemeDark from '~icons/ThemeDark';

const titlebarHidden = false;

export default function Titlebar() {
  const info = useInfo();
  const [url, setUrl] = useState('');
  const [hostname, setHostname] = useState('');
  const [enableAsk, setEnableAsk] = useState(false);
  const [pin, setPin] = useState(false);
  const [theme, setTheme] = useState('system');
  const [fullScreen, setFullScreen] = useState(false);

  useEffect(() => {
    const win = getCurrent();
    let winResize: Function;
    let changeUrl: Function;

    invoke<I.AppConf>('get_app_conf')
      .then((v) => {
        setEnableAsk(v.ask_mode);
        setPin(v.stay_on_top);
        setTheme(v.theme);
      });

    (async () => {
      const full = await win.isFullscreen();
      setFullScreen(full);
      winResize = await win.listen('tauri://resize', debounce(async () => {
        const full = await win.isFullscreen();
        setFullScreen(full);
      }, 50))

      changeUrl = await getCurrent().listen('change:url', (event: any) => {
        const { url } = event.payload;
        setUrl(url);

        try {
          const { hostname } = new URL(url);
          setHostname(hostname);
        } catch (error) {
          setHostname(url);
        }
      })
    })();

    return () => {
      winResize && winResize();
      changeUrl && changeUrl();
    }
  }, [])

  const handleRefresh = () => {
    invoke('view_reload');
  };

  const handleGoForward = () => {
    invoke('view_go_forward');
  };

  const handleGoBack = () => {
    invoke('view_go_back');
  };

  const handlePin = (isPin: boolean) => {
    setPin(isPin);
    invoke('window_pin', { pin: isPin });
  };

  const handleAsk = () => {
    setEnableAsk(!enableAsk);
    invoke('set_view_ask', { enabled: !enableAsk });
  };

  const handleTheme = (theme: string) => {
    invoke('set_theme', { theme });
  };

  const themeIcon = useMemo(() => {
    switch (theme) {
      case 'system':
        return <ThemeSystem title="Light" action onClick={() => handleTheme('light')} />
      case 'light':
        return <ThemeLight title="Dark" action onClick={() => handleTheme('dark')} />
      case 'dark':
        return <ThemeDark title="System" action onClick={() => handleTheme('system')} />
      default:
        return <ThemeSystem title="System" action onClick={() => handleTheme('system')} />
    }
  }, [theme]);

  const handleOpenUrl = () => {
    open(url);
  };

  const renderSettings = useMemo(() => {
    return (
      <div className={clsx('items-center gap-1', {
        'hidden group-hover:flex': titlebarHidden,
        'flex': !titlebarHidden,
      })}>
        {themeIcon}
        {pin
          ? <PinIcon action onClick={() => handlePin(false)} />
          : <UnPinIcon action onClick={() => handlePin(true)} />}
      </div>
    )
  }, [titlebarHidden, themeIcon, pin])

  return (
    <div data-tauri-drag-region className={clsx('flex group pr-2 h-full cursor-default select-none dark:bg-app-gray-2 justify-between', {
      'pl-[80px]': !fullScreen && info.isMac,
      'pl-[10px]': fullScreen || !info.isMac,
    })}>
      <div data-tauri-drag-region className={clsx('items-center gap-0.5', {
        'hidden tablet:group-hover:flex group-hover:hidden': titlebarHidden,
        'flex': !titlebarHidden,
      })}>
        {!info.isMac && <span className="mr-4">{renderSettings}</span>}
        <span
          className="flex items-center bg-slate-300/50 dark:bg-slate-100/10 dark:text-gray-500 rounded-full pl-[4px] pr-[8px] h-[14px] text-[10px] gap-1 text-slate-700 mr-1"
          onClick={handleOpenUrl}
          title={url}
        >
          <LinkIcon size={14} />
          {hostname}
        </span>
        <ArrowLeftIcon action onClick={handleGoBack} />
        <ArrowLeftIcon className="rotate-180" action onClick={handleGoForward} />
        <ReloadIcon action onClick={handleRefresh} />
        <AskIcon
          action
          onClick={handleAsk}
          className={clsx({
            '!text-app-active': enableAsk,
          })}
        />
      </div>
      {titlebarHidden && <div className="tablet:group-hover:flex" />}
      {info.isMac ? renderSettings : <WinTitlebar />}
    </div>
  );
}