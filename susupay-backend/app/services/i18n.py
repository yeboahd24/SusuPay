"""
Internationalization service for notification messages.

Supported languages: en (English), tw (Twi), ga (Ga), ee (Ewe), ha (Hausa)
"""

TRANSLATIONS: dict[str, dict[str, str]] = {
    # --- Payment notifications ---
    "new_payment_title": {
        "en": "New Payment",
        "tw": "Tua Foforo",
        "ga": "Fee Hee",
        "ee": "Fexe Yeye",
        "ha": "Sabon Biya",
    },
    "new_payment_body": {
        "en": "{client_name} submitted GHS {amount:.2f} — tap to review",
        "tw": "{client_name} de GHS {amount:.2f} aba — fa wo nsa ka mu hwehwe",
        "ga": "{client_name} ha GHS {amount:.2f} ba — tswaa kee lE",
        "ee": "{client_name} do GHS {amount:.2f} vaa — te edzi be nado edzi",
        "ha": "{client_name} ya aika GHS {amount:.2f} — danna don dubawa",
    },
    "payment_confirmed_title": {
        "en": "Payment Confirmed",
        "tw": "Tua no Adi Mu",
        "ga": "Fee Kome",
        "ee": "Fexe La Dze Asi",
        "ha": "An Tabbatar da Biya",
    },
    "payment_confirmed_body": {
        "en": "Your GHS {amount:.2f} payment confirmed. Balance: GHS {balance:.2f}",
        "tw": "Wo GHS {amount:.2f} tua no adi mu. Wo sika: GHS {balance:.2f}",
        "ga": "Wo GHS {amount:.2f} fee kome. Wo shikpono: GHS {balance:.2f}",
        "ee": "Wo GHS {amount:.2f} fexe la dze asi. Gawo: GHS {balance:.2f}",
        "ha": "An tabbatar da biyan ku na GHS {amount:.2f}. Ragowar: GHS {balance:.2f}",
    },
    "submission_queried_title": {
        "en": "Submission Queried",
        "tw": "Wɔabisa Wo Tua Ho",
        "ga": "WobO Wo Fee Bii",
        "ee": "Wobiae Ŋu Le Wo Fexe Ŋu",
        "ha": "An Tambaya Game da Biya",
    },
    "submission_queried_body": {
        "en": "Submission queried: '{note}'",
        "tw": "Wɔabisa wo tua ho: '{note}'",
        "ga": "WobO wo fee bii: '{note}'",
        "ee": "Wobiae ŋu le wo fexe ŋu: '{note}'",
        "ha": "An tambaya game da biya: '{note}'",
    },
    "submission_rejected_title": {
        "en": "Submission Rejected",
        "tw": "Wɔapo Wo Tua",
        "ga": "WokE Wo Fee",
        "ee": "Woɖe Wo Fexe Gbɛ",
        "ha": "An Ki Biya",
    },
    "submission_rejected_body": {
        "en": "Submission rejected: '{note}'",
        "tw": "Wɔapo wo tua: '{note}'",
        "ga": "WokE wo fee: '{note}'",
        "ee": "Woɖe wo fexe gbɛ: '{note}'",
        "ha": "An ki biya: '{note}'",
    },
    "duplicate_title": {
        "en": "Duplicate Submission",
        "tw": "Tua a Wɔawie Dada",
        "ga": "Fee Ni WoShia Kɛ",
        "ee": "Fexe Si Wowo Xoxo",
        "ha": "Biya Mai Kwafi",
    },
    "duplicate_body": {
        "en": "This transaction has already been submitted.",
        "tw": "Adesua yi, wɔade aba dada.",
        "ga": "Fee nii woshia kɛ.",
        "ee": "Asitsatsa sia, wodo vaa xoxo.",
        "ha": "An riga an aika wannan biya.",
    },
    # --- Payout notifications ---
    "payout_request_title": {
        "en": "Payout Request",
        "tw": "Sika Yi Abisade",
        "ga": "Shikpono Bii",
        "ee": "Ga Ɖeɖe Biabia",
        "ha": "Buƙatar Fitar da Kuɗi",
    },
    "payout_request_body": {
        "en": "{client_name} requests GHS {amount:.2f} emergency payout",
        "tw": "{client_name} rebisa GHS {amount:.2f} sika a ɛhia ntɛm",
        "ga": "{client_name} bO GHS {amount:.2f} shikpono ni Eha daŋ",
        "ee": "{client_name} bia GHS {amount:.2f} ga ɖeɖe si le kpakple",
        "ha": "{client_name} na buƙatar fitar GHS {amount:.2f} na gaggawa",
    },
    "payout_approved_title": {
        "en": "Payout Approved",
        "tw": "Sika Yi no Adi Mu",
        "ga": "Shikpono Haa Kome",
        "ee": "Ga Ɖeɖe La Dze Asi",
        "ha": "An Amince da Fitar Kuɗi",
    },
    "payout_approved_body": {
        "en": "Your payout of GHS {amount:.2f} has been approved",
        "tw": "Wo GHS {amount:.2f} sika yi no adi mu",
        "ga": "Wo GHS {amount:.2f} shikpono haa kome",
        "ee": "Wo GHS {amount:.2f} ga ɖeɖe la dze asi",
        "ha": "An amince da fitar kuɗin ku na GHS {amount:.2f}",
    },
    "payout_declined_title": {
        "en": "Payout Declined",
        "tw": "Wɔapo Sika Yi",
        "ga": "WokE Shikpono",
        "ee": "Woɖe Ga Ɖeɖe Gbɛ",
        "ha": "An Ƙi Fitar Kuɗi",
    },
    "payout_declined_body": {
        "en": "Payout declined: '{reason}'",
        "tw": "Wɔapo sika yi: '{reason}'",
        "ga": "WokE shikpono: '{reason}'",
        "ee": "Woɖe ga ɖeɖe gbɛ: '{reason}'",
        "ha": "An ƙi fitar kuɗi: '{reason}'",
    },
    # --- Daily reminder ---
    "daily_reminder_title": {
        "en": "Daily Reminder",
        "tw": "Da Biara Nkaeɛ",
        "ga": "GbE Kome Nkaε",
        "ee": "Ŋkeke Sia Ŋkeke Nunya",
        "ha": "Tunatarwar Yau",
    },
    "daily_reminder_body": {
        "en": "Remember to send GHS {amount:.2f} to {collector_name} today",
        "tw": "Kae sɛ ɛsɛ sɛ wode GHS {amount:.2f} ma {collector_name} ɛnnɛ",
        "ga": "Tsu lɛ be wo shi GHS {amount:.2f} ha {collector_name} ene",
        "ee": "Ɖo ŋku edzi be nàdo GHS {amount:.2f} na {collector_name} egbe",
        "ha": "Ka tuna cewa za ka aika GHS {amount:.2f} zuwa {collector_name} yau",
    },
    # --- Payout reminder ---
    "payout_reminder_title": {
        "en": "Payout Reminder",
        "tw": "Sika Yi Nkaeɛ",
        "ga": "Shikpono Nkaε",
        "ee": "Ga Ɖeɖe Nunya",
        "ha": "Tunatarwar Fitar Kuɗi",
    },
    "payout_reminder_today": {
        "en": "Your payout is scheduled for today ({date})!",
        "tw": "Wo sika yi no wɔ ɛnnɛ ({date})!",
        "ga": "Wo shikpono le ene ({date})!",
        "ee": "Wo ga ɖeɖe le egbe ({date})!",
        "ha": "Ana fitar kuɗin ku yau ({date})!",
    },
    "payout_reminder_tomorrow": {
        "en": "Your payout is tomorrow ({date}). Keep contributing!",
        "tw": "Wo sika yi no wɔ ɔkyena ({date}). Kɔ so tua!",
        "ga": "Wo shikpono le achiaa ({date}). Yɛ tswa ha!",
        "ee": "Wo ga ɖeɖe le etsɔ ({date}). Yi edzi tso nu!",
        "ha": "Za a fitar kuɗin ku gobe ({date}). Ci gaba da bayarwa!",
    },
    "payout_reminder_days": {
        "en": "Your payout is in {days} days ({date}). Stay on track!",
        "tw": "Wo sika yi no aka nna {days} ({date}). Kɔ so yie!",
        "ga": "Wo shikpono le nkE {days} mli ({date}). Yɛ tswa ha!",
        "ee": "Wo ga ɖeɖe le ŋkeke {days} me ({date}). Nàyi edzi!",
        "ha": "Za a fitar kuɗin ku cikin kwanaki {days} ({date}). Ku zauna a kan hanya!",
    },
    # --- Streak ---
    "streak_title": {
        "en": "Streak: {streak}",
        "tw": "Nsrahwɛ: {streak}",
        "ga": "Tswa: {streak}",
        "ee": "Ɖeka Ɖeka: {streak}",
        "ha": "Jerin Nasara: {streak}",
    },
}

DEFAULT_LANG = "en"
SUPPORTED_LANGS = {"en", "tw", "ga", "ee", "ha"}


def t(key: str, lang: str = DEFAULT_LANG, **kwargs) -> str:
    """Get a translated string with optional format arguments."""
    lang = lang if lang in SUPPORTED_LANGS else DEFAULT_LANG
    translations = TRANSLATIONS.get(key, {})
    template = translations.get(lang) or translations.get(DEFAULT_LANG, key)
    try:
        return template.format(**kwargs)
    except (KeyError, IndexError):
        return template
