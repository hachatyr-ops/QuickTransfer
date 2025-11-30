export const translations = {
  RU: {
    landing: {
      title: "Передавайте файлы безопасно.",
      subtitle: "Простое и безопасное соединение между вашими устройствами через браузер. Не нужно проходить регистрацию или устанавливать дополнительные программы.",
      iAmHost: "Я — Компьютер",
      hostDesc: "Получить QR-код для приема файлов с телефона.",
      startReceiving: "Начать прием",
      iAmClient: "Я — Телефон",
      clientDesc: "У меня есть файлы для отправки.",
      inputPlaceholder: "Введите ID сессии (6 цифр)",
      connectBtn: "Подключиться",
      privacyTitle: "Полная конфиденциальность",
      privacyDesc: "Ваши файлы не сохраняются на серверах. Данные передаются напрямую на устройство получателя. Никаких цифровых следов.",
      securityTitle: "Совет по безопасности",
      securityDesc: "Ввод личных паролей на чужих устройствах (в копицентрах, университетах, отелях) — это риск кражи вашего аккаунта. Используйте этот сервис в общественных местах, чтобы передать файлы, не входя в свои учетные записи."
    },
    host: {
      connectionTitle: "Подключение",
      scanText: "Сканируйте камерой телефона",
      idLabel: "ID",
      statusOnline: "В сети",
      statusOffline: "Нет связи",
      connecting: "Связь...",
      stopSession: "Завершить сессию",
      receivedFiles: "Полученные файлы",
      pieces: "шт.",
      receiving: "Прием",
      emptyFiles: "Отправьте файл с телефона...",
      downloadBtn: "Скачать"
    },
    client: {
      title: "Прямая отправка",
      exit: "Выход",
      switchRole: "Поменяться местами (Прием)",
      speedFast: "Быстро",
      speedNormal: "Норма",
      speedSlow: "Танк",
      speedDescFast: "Идеально для фото и скриншотов < 1 МБ",
      speedDescNormal: "Баланс скорости и надежности (1-5 МБ)",
      speedDescSlow: "Медленно, но надежно (для плохой сети)",
      statusConnecting: "Поиск...",
      statusConnected: "Связь есть",
      statusFailed: "Нет связи (404)",
      uploading: "Идет передача...",
      verifying: "Проверка ID...",
      chooseFiles: "Выбрать файлы",
      errorId: "ID сессии не найден.\nПроверьте цифры на компьютере.",
      doNotClose: "Не закрывайте браузер",
      historyTitle: "История отправки",
      noHistory: "Нет отправленных файлов",
      sent: "Отправка",
      sending: "Передача"
    }
  },
  EN: {
    landing: {
      title: "Transfer files securely.",
      subtitle: "Simple and secure connection between your devices via browser. No need to register or install additional software.",
      iAmHost: "I am a Computer",
      hostDesc: "Get a QR code to receive files from a phone.",
      startReceiving: "Start Receiving",
      iAmClient: "I am a Phone",
      clientDesc: "I have files to send.",
      inputPlaceholder: "Enter Session ID (6 digits)",
      connectBtn: "Connect",
      privacyTitle: "Total Privacy",
      privacyDesc: "Your files are not stored on servers. Data is transferred directly to the recipient's device. No digital footprint.",
      securityTitle: "Security Tip",
      securityDesc: "Entering personal passwords on public devices (copy centers, universities, hotels) is a risk. Use this service in public places to transfer files without logging into your accounts."
    },
    host: {
      connectionTitle: "Connection",
      scanText: "Scan with phone camera",
      idLabel: "ID",
      statusOnline: "Online",
      statusOffline: "Offline",
      connecting: "Connecting...",
      stopSession: "End Session",
      receivedFiles: "Received Files",
      pieces: "pcs",
      receiving: "Receiving",
      emptyFiles: "Send a file from your phone...",
      downloadBtn: "Download"
    },
    client: {
      title: "Direct Send",
      exit: "Exit",
      switchRole: "Switch Roles (Receive)",
      speedFast: "Fast",
      speedNormal: "Normal",
      speedSlow: "Tank",
      speedDescFast: "Perfect for photos < 1 MB",
      speedDescNormal: "Balance of speed and reliability (1-5 MB)",
      speedDescSlow: "Slow but reliable (bad network)",
      statusConnecting: "Searching...",
      statusConnected: "Connected",
      statusFailed: "No connection (404)",
      uploading: "Transferring...",
      verifying: "Verifying ID...",
      chooseFiles: "Select Files",
      errorId: "Session ID not found.\nCheck the digits on the computer.",
      doNotClose: "Do not close the browser",
      historyTitle: "Sent History",
      noHistory: "No files sent",
      sent: "Sending",
      sending: "Transferring"
    }
  }
};

export type Language = 'RU' | 'EN';
export type Translation = typeof translations.RU;