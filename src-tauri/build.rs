fn main() {
  // Fuerza a Windows/Tauri a reconstruir el recurso del ejecutable cuando se
  // actualiza el icono. Sin esto, `tauri dev` puede conservar el icono previo.
  println!("cargo:rerun-if-changed=icons/icon.ico");
  println!("cargo:rerun-if-changed=icons/icon.png");
  tauri_build::build()
}
