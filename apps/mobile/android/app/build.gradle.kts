import java.util.Properties
import java.io.File
import java.io.FileInputStream

plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

// Credenciales de firma del release. Fuentes (en orden):
//   1. android/key.properties (gitignored; se genera en CI a partir de secrets
//      o a mano localmente). Ver el anexo "Release mobile" de docs/RELEASES.md.
//   2. Variables de entorno KEYSTORE_FILE/KEYSTORE_PASSWORD/KEY_ALIAS/
//      KEY_PASSWORD (para builds de CI sin archivo de props).
// Si no hay keystore disponible, el release firma con las claves debug para
// que el desarrollo local (`flutter run --release`) siga funcionando; jamás se
// publica a la Play Store con esa firma.
fun loadSigningProperties(): Properties {
    val props = Properties()
    val propsFile = File(rootProject.file("key.properties").absolutePath)
    if (propsFile.exists()) {
        FileInputStream(propsFile).use { props.load(it) }
    }
    System.getenv("KEYSTORE_FILE")?.let { props.setProperty("storeFile", it) }
    System.getenv("KEYSTORE_PASSWORD")?.let { props.setProperty("storePassword", it) }
    System.getenv("KEY_ALIAS")?.let { props.setProperty("keyAlias", it) }
    System.getenv("KEY_PASSWORD")?.let { props.setProperty("keyPassword", it) }
    return props
}

val keystoreProperties = loadSigningProperties()

fun hasReleaseSigning(): Boolean {
    return keystoreProperties.getProperty("storeFile") != null &&
        keystoreProperties.getProperty("storePassword") != null &&
        keystoreProperties.getProperty("keyAlias") != null &&
        keystoreProperties.getProperty("keyPassword") != null
}

// Lectura tipada: Properties.getProperty devuelve String?; AGP 9 exige String.
fun signingValue(key: String): String {
    val value = keystoreProperties.getProperty(key)
    return requireNotNull(value) { "Falta credencial de firma: $key" }
}

android {
    namespace = "app.nora.mobile"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        applicationId = "app.nora.mobile"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        if (hasReleaseSigning()) {
            create("release") {
                keyAlias = signingValue("keyAlias")
                keyPassword = signingValue("keyPassword")
                storeFile = file(signingValue("storeFile"))
                storePassword = signingValue("storePassword")
            }
        }
    }

    buildTypes {
        release {
            // Si hay keystore real lo usamos; si no, se cae a las claves debug
            // para desarrollo local. El job de release en CI inyecta key.properties.
            signingConfig = if (hasReleaseSigning()) {
                signingConfigs.getByName("release")
            } else {
                signingConfigs.getByName("debug")
            }
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}
