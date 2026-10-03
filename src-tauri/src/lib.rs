use tauri::Manager;

#[cfg(target_os = "windows")]
use raw_window_handle::{HasWindowHandle, RawWindowHandle};
#[cfg(target_os = "windows")]
use windows::{
  core::{w, BOOL},
  Win32::{
    Foundation::{HWND, LPARAM, WPARAM},
    UI::WindowsAndMessaging::{
      EnumWindows, FindWindowExW, FindWindowW, GetWindowLongPtrW, SendMessageTimeoutW,
      SetParent, SetWindowLongPtrW, SetWindowPos, GWL_STYLE, SMTO_NORMAL,
      SWP_FRAMECHANGED, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE, SWP_NOZORDER,
      WS_CHILD, WS_POPUP,
    },
  },
};

#[cfg(target_os = "windows")]
unsafe extern "system" fn find_workerw_after_desktop_view(window: HWND, data: LPARAM) -> BOOL {
  // Windows coloca los iconos en SHELLDLL_DefView. El WorkerW hermano siguiente
  // es la capa donde se pueden hospedar widgets detrás de las aplicaciones.
  let desktop_view = unsafe { FindWindowExW(Some(window), None, w!("SHELLDLL_DefView"), None) }
    .unwrap_or_default();
  if !desktop_view.0.is_null() {
    let worker = unsafe { FindWindowExW(None, Some(window), w!("WorkerW"), None) }
      .unwrap_or_default();
    if !worker.0.is_null() {
      unsafe { *(data.0 as *mut HWND) = worker };
      return BOOL(0);
    }
  }
  BOOL(1)
}

#[cfg(target_os = "windows")]
fn desktop_workerw() -> Result<HWND, String> {
  let progman = unsafe { FindWindowW(w!("Progman"), None) }.map_err(|error| error.to_string())?;
  if progman.0.is_null() {
    return Err("Windows no expuso la capa Progman del escritorio.".into());
  }

  // 0x052C pide a Explorer crear/mostrar la capa WorkerW auxiliar.
  unsafe {
    SendMessageTimeoutW(progman, 0x052C, WPARAM(0), LPARAM(0), SMTO_NORMAL, 1000, None);
  }

  let mut worker = HWND::default();
  unsafe {
    EnumWindows(
      Some(find_workerw_after_desktop_view),
      LPARAM((&mut worker as *mut HWND) as isize),
    )
    .map_err(|error| error.to_string())?;
  }
  if worker.0.is_null() {
    return Err("No fue posible encontrar la capa de escritorio WorkerW.".into());
  }
  Ok(worker)
}

#[cfg(target_os = "windows")]
fn pin_widget_to_desktop<R: tauri::Runtime>(widget: &tauri::WebviewWindow<R>) -> Result<(), String> {
  let handle = widget.window_handle().map_err(|error| error.to_string())?;
  let RawWindowHandle::Win32(handle) = handle.as_raw() else {
    return Err("La ventana actual no usa un identificador Win32.".into());
  };
  let widget_hwnd = HWND(handle.hwnd.get() as *mut _);
  let worker = desktop_workerw()?;

  widget.set_always_on_top(false).map_err(|error| error.to_string())?;
  widget.set_always_on_bottom(true).map_err(|error| error.to_string())?;
  unsafe {
    SetParent(widget_hwnd, Some(worker)).map_err(|error| error.to_string())?;
    // SetParent no actualiza estos flags por sí mismo. Sin WS_CHILD, Windows
    // mantiene la ventana en la capa flotante aunque tenga un padre WorkerW.
    let style = GetWindowLongPtrW(widget_hwnd, GWL_STYLE);
    SetWindowLongPtrW(
      widget_hwnd,
      GWL_STYLE,
      (style & !(WS_POPUP.0 as isize)) | WS_CHILD.0 as isize,
    );
    SetWindowPos(
      widget_hwnd,
      None,
      0,
      0,
      0,
      0,
      SWP_NOACTIVATE | SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED,
    )
    .map_err(|error| error.to_string())?;
  }
  Ok(())
}

#[tauri::command]
fn open_widget(app: tauri::AppHandle) -> Result<(), String> {
  if let Some(widget) = app.get_webview_window("widget") {
    // Mostrarlo nunca debe depender de que Explorer exponga WorkerW; de lo
    // contrario un fallo transitorio del escritorio deja el botón sin efecto.
    widget.show().map_err(|error| error.to_string())?;
    #[cfg(target_os = "windows")]
    if let Err(error) = pin_widget_to_desktop(&widget) {
      eprintln!("No fue posible anclar el widget al escritorio: {error}");
    }
    return Ok(());
  }

  Err("No fue posible encontrar la ventana widget configurada.".into())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![open_widget])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
