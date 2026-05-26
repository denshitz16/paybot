$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME = 'C:\Users\Admin\AppData\Local\Android\Sdk'
$env:ANDROID_SDK_ROOT = 'C:\Users\Admin\AppData\Local\Android\Sdk'
$env:Path = 'C:\Program Files\Android\Android Studio\jbr\bin;' + $env:Path
cd C:\Users\Admin\Desktop\paybot\mobile\android\android
cmd /c gradlew.bat assembleRelease
