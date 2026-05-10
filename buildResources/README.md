# buildResources/

electron-builder lee este directorio automaticamente al empaquetar la app
(`directories.buildResources` en [`electron-builder.yml`](../electron-builder.yml)).

## Archivos esperados

Antes del primer release **agregar manualmente**:

| Archivo                              | Plataforma | Detalle                                        |
| ------------------------------------ | ---------- | ---------------------------------------------- |
| `icon.ico` (256x256, multi-res)      | Windows    | Icono del .exe + accesos directos              |
| `icon.icns`                          | macOS      | Icono del .app + .dmg                          |
| `icon.png` (512x512)                 | Linux      | AppImage / deb                                 |
| `installer.nsh` (opcional)           | Windows    | Tweaks NSIS extra (referenciado desde YAML)    |
| `license.txt`                        | NSIS       | Texto que aparece en el wizard del instalador  |
| `background.png` (540x380, opcional) | macOS DMG  | Fondo del volumen DMG                          |

Si los iconos no estan presentes electron-builder usa los iconos por defecto
de Electron (no recomendado para release publico).

## Generacion rapida

```bash
# Windows .ico desde un PNG 1024x1024:
npx png-to-ico icon.png > icon.ico

# macOS .icns:
npx png2icons icon.png icon -allp
```

## Nota sobre `.gitignore`

`build/` esta gitignoreado (output de algunas herramientas).
**Este directorio (`buildResources/`) se versiona** para que los assets de marca
viajen con el repo y CI pueda firmarlos / empaquetarlos.

## Nota de release 1.15.0

Pulso Nora usa assets publicos del renderer (`public/nora-evo/`) y no requiere
cambios en los recursos nativos de electron-builder. Los iconos de instalador y
DMG siguen saliendo de este directorio.
