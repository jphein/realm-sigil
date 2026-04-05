# realm-sigil WordPress Plugin

Must-use plugin that adds `/wp-json/realm-sigil/v1/version` to any WordPress site.

## Install

1. Copy `realm-sigil-version.php` to `wp-content/mu-plugins/`
2. Add config constants to `wp-config.php` (before "That's all, stop editing!")

### jphein.com (forge realm)
```php
define('REALM_SIGIL_NAME', 'jphein.com');
define('REALM_SIGIL_DESCRIPTION', 'JP personal site');
define('REALM_SIGIL_REALM', 'forge');
define('REALM_SIGIL_REPO', '');
```

### jewelrycycle.com (tarot realm)
```php
define('REALM_SIGIL_NAME', 'jewelrycycle.com');
define('REALM_SIGIL_DESCRIPTION', 'JewelryCycle handmade jewelry');
define('REALM_SIGIL_REALM', 'tarot');
define('REALM_SIGIL_REPO', '');
```

## How It Works

- Hash is derived from `md5(wp_version + theme_version)` (first 7 chars)
- Same WP + theme version always produces the same magical name
- Updates to WordPress or the theme change the hash → new name
- Extra fields: `wp_version` and `theme` included beyond the standard contract

## Test

```
curl https://yoursite.com/wp-json/realm-sigil/v1/version | python3 -m json.tool
```
