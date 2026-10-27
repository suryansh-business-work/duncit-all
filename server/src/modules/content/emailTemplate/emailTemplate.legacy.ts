import crypto from 'node:crypto';

/**
 * Fingerprints of every email body and fragment Duncit has SHIPPED as a
 * default before the 2026-10 redesign — generated once, never edited by hand.
 *
 * `upgradeShippedDefaults` uses them to tell a stored row nobody has touched
 * from one an admin edited: a row whose body still matches one of these is
 * the old default and is moved to the new one; anything else is the admin's
 * and is left exactly as it is. Sources: every on-disk `.mjml` file across
 * its whole git history, and the code-built bodies and fragments as they stood
 * the day the redesign landed — plus, appended 2026-10-19, every body and
 * fragment as it stood before the one-card redesign (icons, dark mode), so
 * the rows that shipped on 2026-10-15 move onto it too — and, appended
 * 2026-10-27, every body as it stood before the phone layout (stacked detail
 * rows, full-width button). Before changing the builders again, append the
 * then-current fingerprints the same way.
 *
 * A fingerprint is `shippedFingerprint` of the MJML: whitespace collapsed, so
 * a re-indented copy still matches, then the first 16 hex of its SHA-256.
 */

/** The fingerprint a shipped default is recognised by. */
export function shippedFingerprint(mjml: string): string {
  const collapsed = mjml.replaceAll(/\s+/g, ' ').trim();
  return crypto.createHash('sha256').update(collapsed).digest('hex').slice(0, 16);
}

/**
 * One line per template: its slug, then every fingerprint it shipped with.
 * Text rather than an object literal because it is a generated table, not
 * code: 190 rows of `"slug": ["…", "…"]` read as one repeated shape to a
 * duplication scan, and appending a snapshot is one more word per line.
 */
const TEMPLATE_TABLE = `
account-deletion-completed bcb4a6673722bc0f ec81133e29243d1f a523896c6949b7be
account-deletion-otp 0798a0937f75b9d1 24a357e04bf74e21 2c748f03af008704 dab7132389dcac2e f0d20db8d370e17e
account-deletion-rejected f4cb9e2bca296877 95005f211f74dd28 db5736c0bf4d21cb
account-deletion-requested 5dc4b26347b40994 07c800c457961377 f7fba2f328fc42ba
ad-in-review 36365eac06bc8b9f 6d1240380352d402 8666b08ec5d380ff 9ab631ee42510f11
ad-live d0cb451ab6eaed34 40e2cd0a1f15fb25 4734d82a1b976f3f c8155bc4bf4343e8
ad-rejected e33696c644db04bd 6df95d7e01aeebe5 7a456fcfae2fee4a ed7e7afd5ae0c3cc
admin-access-granted 51cb48511eea9189 15e17afb284369a0 f95a7fdba03a3ed5 0b56a6c942b782fc e3dc34bef62e2ba8 bde9dc9774b1a691 302fb7690dfc23bd 079fb5a060b2edc7
admin-access-revoked 2b206ce83b00c030 10d78c7dc3092782 70b8c2e6763cdd66 a88fbd3b734ab15e 961ab997e0afbd95 770f4d484f9aa499 08960b799b0da0d0 e4ea550fac270840
admin-credentials e02f3220bf8bcb97 b92102254fbaf9db 1f6dd01bf8357e1f ea3601d499ee7b64 62a699cfe4bcc077 4b3369078115a12b 759117cb10f1268f c6c280df16fcc35b df24614fcc364bdb 995d0e6ea66d4506 4a02a6ec935a4bea
analytics-alert dc5484d5111dbfb0 9ac27b00aefc6051 1877fa015dc3cb1b 5060ef3319267088
analytics-report 146ad676d9f243e8 79b723d32e44e1cd eb0a617e10fa09ff 2f26dd4728e2a4ad
analytics-subscribed c4f9731b826edb0a d617cfe0c9e60f17 07f43c514e50d175 f578deb5dcd5d2fb
app-release-build 560b56c3f8846758 9c469a59fbf00cff 8c11926495c8507e
attendance-marked b451856e7e4f67c3 eee521befc3ea30b b7a224094c1f0c70 8f6b21b6cb20308b
auto-pod-released 3253cad0ed895df8 84e9b2788add99dc 126127ffed461a8b b026fc52be676824
automation-message d12e070566825d3b 1fd02255f729c9c7 f1d20ea92cdfa3ea 5f35e31e0870e5e5
bank-details-changed bcb7a7c5b8a9cc51 c7cb71031d71b0c9 5c8a3c0929ac8c04
brand-activated 2c29bd7f41b33171 7b5d18b409b812fd 3d2b8a840d4b0e2e 3c73fffc7b4e1bdb
brand-deactivated c0b7e6e4e55feb96 7b312080f87b0a56 83bf72b2bfaadda6 c96a130ae58b14da
catalog-deletion-update 8f739d5bbc5c52a0 0bde7647089fea96 848da18a172bf766 7575b4f6a653ea02
club-admin-account-reactivated e9e78c9b7789fa2e 951661a611486de3 36cb31aa2a24880e 0787525e326f58d7
club-admin-account-suspended 054edca527d5e327 f2b8d837e92f8ec8 40088ad6e7f5a294 8fa0126222db9a56
club-admin-change-request-offer 43c30a10178a8a03 b9f7cb2980e64f42 6714f281a52a3fb3 c77735e2bf70b3b7
club-admin-host-help dd2fd6c9cc5a9e98 aad8e94ff537b450 c2a8d2ea167d004a e91bdb46492d6b6b
club-admin-meeting-rescheduled f3b6895e444b0dba 4c12f6b5f42e7d5f 97ec2b5558f6f4d5 d70a22c6492172c0
club-admin-onboarding-approved 3fd112154c527337 1099bc0aef989a52 1e19865a4a67b3f7 2e68d65fedab2c19
club-admin-onboarding-booked 764ca6a63b1f2c9a 819884bf4e91b1f0 c7e12b1a0835c13b 5aef852d1b5397c4 2b2c1b44e503c2a2
club-admin-onboarding-interview 334b686c8b3350aa 51fb2824c4f58f7a 9e042b07b6091c81 472475ebf0e27b30 53415faf8ed1fe57
club-admin-onboarding-rejected 893904d3327d3c50 4268044be428f8cf 413a726caff26e0e 4b3d856a4ee97845
club-admin-pod-cancellation-risk f62f41bbde0d5e48 27cb3b6b62885a87 61de6e737f3409cf f14822c0a97cc4f9
club-admin-pod-cancelled 690082595ac39cce f2272e610e2871a9 cfefbd8014ae3a74
club-admin-pod-feedback 0be73813f84dcd44 333d0db4f37eb079 1fe1f51e32b78fdd c0ee422f80e35357
club-admin-venue-help 164f52e69337cfef 17fbb42dea1875e1 12a434bf1bb28b0d 66304a9fd4b20a30
club-admin-venue-slots-needed d6749ebacf2be329 f660a94d891ac1d3 7694898e98352cc1 fff2e1728aa258d6
coin-expiry-reminder cc5f7b578e6fc3ca 309e665162b42a00 d275e701f5d481a8
contact-changed-alert 39dbdb9e721684e5 3d019923e1086c2e 70f933f18cb41d3f
contact-received cab92cd93a795fb2 8b9c37157a2af60b c8770d5f733f9455 160741082334efed c0c6442e1ffacb40 f0c8d2301f169e23 f7ce9af3f91f8f3c f0d960ff8ab19850 bed85d88f29a48be
content-removed-owner 7cd989fb41995a46 f33b121661ea502e 176317b685dc6324 90e2ee536ff9100d
content-report-actioned 580dc7699488f4c6 0e3b6b8e6dbb6eaf a4d481c4ba33e25a 3b5f2f2488fef830
content-report-dismissed f88119312fb6223a 703781292d78534f d8a9aef4ee3e3daa 77960254e0ca0e8d
content-report-message 7e1d979e9833f562 e0b370a6e9e85f7f 6015ce210192e77e 812f003eed032aa3
content-report-received 0a3987ff0b56bb44 be5a2d6ff211acc4 18355f658f2066c0 6876fbe428e29e7d
ecomm-brand-added 367ed226be2d189c 22e7222b70a20ae4 7771e33df852559f bd827b11d9fd4f32
ecomm-brand-deleted 8b1699eeb3b643bb 01038d42ae264853 2d03a492bed90419 8ec8e66cab83443c
ecomm-brand-rejected 9e35192c05aec924 64edc3ca9eac59b1 743e696683c9e6bd 756578aa05589283
ecomm-brand-review-requested d0b01f53daa07411 3b71cedd6e753f6a fe7c1440b620a9cd cddd4f3f18991f37
ecomm-brand-submitted 26b4fb7a28775349 eccd98d1bd53296f 21c9587524423ebc 99fd26207f7b8f2c
ecomm-meeting-rescheduled 7f9d8b388627c698 cfca179a7a6e04ca 8bb40cb3357562a1 c186edf59fd56c0d
ecomm-new-order a681a3c02202b6ff 1ecce9532bf73075 bd3d9e807d94c150
ecomm-onboarding-approved 9e90fe66891fa837 e3243e5c13a6e86c c7e320894ffd633e 29e50a4977f39b5f
ecomm-onboarding-booked e6ea189252b56957 455274f4e52ca06c 0e9c62afd4cba513 127fe39ed96bac92 8984195bf0f61d4e
ecomm-onboarding-interview fd039980f7a35121 c6a70d95e03d3010 c56366b67a473ef2 12d800a7565523cc f042bd16e5bba466
ecomm-onboarding-rejected 273ec943e2542ed7 8329508a8371bc60 1f794163eba275e1 f6ff9366a732870e
ecomm-order-delivery-issue 092cf73465f3240b 1533dafac09f7630 cf5fb3ab8ba0c862
ecomm-order-feedback d73a7ea2e7b0ad44 049ff37492499542 5719a8c6f7291383 b33de26ff8826302
ecomm-product-added e50237b2b8a48bfe 6e19ec8d7a012b1f 0a702244545ad229 57c23db6fe14b9e9
ecomm-product-declined f85abddaa33430c0 b503c328331519a5 78285a44796a482a
ecomm-stock-low a8242c861a3b519c 215226d96aca0902 14621550b6e86faa 6a4382f767f2f487
ecomm-stock-out 16506a7aa40c1c3f 1a2ae4f4632da28e 1fc38447735f3481 61c7be7e9fc8d08f
email-verification-otp 65fbcac56fd1de7e 4921f108776d7851 478f00a7ee685f84 9ec991d7327a267e ed377a51fdaf172d 71ad518777f054b8 0f9746425f04bc4d f305c3d7c25d3faa e4327e76815afeea
env-access-otp 18d9069d3e91df59
event-ticket ea208de12fdc3397 3dd922b791fcaec5 fea6edc391c6496a 36089514b54034df 067dc42432b90ed7 768c90826bc96f5d b4fdc013931b704b 4c5ad7a1f0189766 c8bc12b7e6132c8d 0272a6b53591bd0b 221172f0cd9b1cab
faq-received 1abc108b083a065d e54bd1931e50e7eb 0b9f80771f58b1d8 5e8e14e75bc60dff 287967d5315a65e2 73d29d28bf88eb63 c8b04428f3ff6f33 4d318fa4f723bc7f 016d41b6255a76da
gift-card-received b22c8823d03c0f7a 852f828d7f7c0220 774ad66b5b535e90 17116704ae85751a
grievance-in-review 541561c1fdc6f45d 325188b565706d59 8d02fd3f8f31965c 6a4a09e4622243a2
grievance-received 6a213e5a922522bd 4ae4cdfeebf071cb 8adea5659a49e2be 63ed94c7c0cc31f7
grievance-rejected dcd0073141f86df8 906be7db4623780c 33834ed19b42e01b 2d32837f930b2721
grievance-resolved 00cf19ed3f9b243d 6cf25e5f014f538f fe9db7dca5f7fdf7 43c14f9236efd7a1
host-activated 771c7ba0c9d9fdb2 cda171a239f39d21 c90b75028fe78fb1 c6e8d4821aef79c8
host-change-request-offer f9fce4d26a50be29 28d2380566d9b199 29deeb78264afe44 4198fee7663ed88f
host-complete-pod-reminder 9c33833997994341 d04f371eface7e9e 2c689c3cf94e2144 6e68fb5c2ce975d7 dbc4c28128adb67f
host-deactivated 2516284fd620d8c3 5a161bfe152ead0c b3ec8cb476dd9ddc 830008585abb87a8
host-meeting-rescheduled e2ed17bddb778bce a616164735d3d5de bfd4e58cec1de92d 387410687922809f
host-onboarding-approved 22fd18fced863a4e 79ab8abaff00517f a4e8b1055f64f766 ddb1af7f46ca2192
host-onboarding-booked 5141de498243c780 9afae443ee836de3 f43d6e39aa2c3991 5465d1ca11bc1045 3fcb2fe3073f5f48
host-onboarding-interview fc026d3eb344f537 32b634785123581c 2f58c189eab5ba77 d032642f1a292643 98158aa4e0acf14a
host-onboarding-rejected f14148add61f4e41 220cab989c62ada5 d4d298076b9cc7b7 4d958a28cd662190
host-pod-auto-cancelled 364dc8d87212d6c7 48aa048a7741b5b2 86ce65a0a10690d4 0cd4f9e803784593
host-pod-cancellation-requested 0b63488da8afb001 2376689a4834d7cd 1b02e2b643bb10a5 324466d6c3e426be
host-pod-cancellation-risk 0dbcf7df1207f381 ea2458b4da2abf60 8223f526524cb26e f33b732bac6046a9
host-pod-feedback 0d72cf6a03e5f409 60cb2f04f1f29b1d f09142cb473ba872 10721d281905128d
host-pod-full 7d030397d1adc16e b8cc93f8cacef192 a59d0ea724401868 9b411720f220af8f
host-pod-published 7050c7acf55c38e1 91e193fc3960679b abe6eead31164cfe 3d4d20953e31b57b
host-pod-reminder f6fa205fd3f4d103 0b387365e12571ef 355e8c29a25ba908
host-request-acknowledged 332c73bc59934e03 a85c13c4db01a2eb 912a22c9c573dd20 c444110176ae9cca 87a367f2e6aef700 b4cbf400bc339007 25816bd3cd8da95b 41938cc4309cbda2
host-request-approved 11f32b58461adc1f e1d61b47110de839 b81ee897f3143997 2d8c38409ca3de22 1d81b9c16eeaf4d4 8d60ee0397525856 d488f6767349eaf0 9b95cc68852cac39
host-request-rejected e1fe3f9bb7519409 802b87a832728ea4 4ac6ad32bf14fc65 7d936f55e329329e 1903414a04fe5acf 85f0e65b5f130a3a 3e3dcda30f1e12db 054e6f7a0abfc7df
host-request-submitted 87ce8c3b5a5ae64c 816816057c0ea0d7 e38031e9ae9e19f6 6063f6de84d119cf 3fdc15c906063886 da533e7b3473243c 188d3c749250a29c 5f82aeabeabbbe7e
host-slot-approved abf5fe2fab6a79e3 57b0f05b25ff4ebe 60ef630b726299cb d2541845250d3b3b
host-slot-rejected ac171c142e1761a1 b7d53d64071d8fec 945001ca69670486 45f9d8d72634127b
host-venue-counter-offer 4f9852208c7dbda0
interview-admin 32abafabf3ca4b84 1e408e9b996280f8 3d022be1521b6deb 728266d87b4005b1 cdbf3d16452b2e4f d6567a7bf5beea4a f4dca454f20bf2b5 4d5bc507f9280f4d 6ca5152186ddafd1 2902fc43d2329346 b9afa3e5ffbea021
interview-applicant 860eb79d150dfb29 1f6e0d7e49b5749a c6021d1123ae8705 8c984462c48d49b8 5d408af7e627c4b0 342a6183512221b7 93f44d4ff49f1efd 09223ddb4792a065 76176374a48b79cd 12fd044119eb5180 4f67eed32d0f7821
interview-scheduled 72198704db89f72e c9e4079db4cdef38 33c23f6fad75464f 02eed3158db83f0f 27e05e3f5f0e6844 5b9735eab035992b 86ed553d04444f13 65bc9d690c1604e4 e36864bf87b2f1db 80b60fb7f96e211d 582ff4d8fb95f8a4
login-otp 64987a833d11c1ce 2434dd7aa3fe17ab f1051af78ea21037 c734eb6c89dabed0
meeting-approved 5ab0ccfa759c3e57 8cd0d07d03de844e 6a7546322409b672 b02fffa079eb8648 8fb883cbe5b7c28e
meeting-booked 712fa1316115f9cf ce89f92fc5f8dd0d 0e49176f1981e06b 75261f9ab8cbe194 7eef97406e9a3f7b dabb522843d6a226 79b2f726066a0262 8b1c0c7251cd38fd
meeting-cancelled de4d6ddf9b774876 caf31161f2314b52 24465467970c13d9 29f8ce89202fbb5b f41fd17421aa20fb 9e6eb58e55448021 5092e27ef17a4aac 148b74045ee580c6 e3916c61b5a2400b 12449e12f94281b8 440b2df3adc883b4 ce5a2bf3358d8cc3 425e2ea33a6b9fbb
meeting-rejected fda80f79caab99a5 1b31f661cb05aef5 06f4facea8df09ce 508543d53bf982c9 10e264a8c610b00f
meeting-reminder 11c10166708baa2f 25385dda5a98b306 7f5f45b800454b2d
meeting-rescheduled 3005f39dd934e6d6 63cd3bdc005892f2 59345324948af43a 4ea852840434e133 87b0024516632796
meeting-scheduled 21a0112abbe6e6cf 2ccf4ba003b08421 e215f3290234ff52 63c3fec9133dbe5d 57917bdbcce62025 58161fb1fff32f1b d95aefd60ca47de6 fa6752675c813e58
meeting-scheduled-admin d24d95db7b9e2554 a3fce79921d0f09e ea621c6c6ceef631 96c9f703d6440f8d df174d29395d7e66 102cd6c285e80677 7bb1caad5dc8c71e aa5b33a8bc0ddcb3
newsletter-welcome 1c5166a36a192029 e21d8ac1f8234a1d e9122cc42d3b3c8f 2d61a5bc3fee7e6a 04385c9594eeda7c 24da2ae8ec1a018e 9eb188528528f597 6d40a2a295954e7e 3807c7eba9a90985
order-refund a5a04239c5dc2005 ec5aef6b61b63dbc b2ba28d7d0b50e20 4791468d41b7dc6a
partner-access-granted 88881c231dd8b547 c5fa2f5a8b054440 4bbcf0b191fc4ba0 59721d130a9ffcce a3fecd7633b58261
password-change-otp 2bb4062797b0f4a2 a36abd8226bef00e 0cdc3b37c7c15d4e 9031e37c4a2c9130 1c34ea15a4a13ed3
password-changed 54a2c8dd93009add 6a266b8726b6f072 32a93782889be7e0 2365e68b663427e1
password-reset-otp e5bf147c251a3dae d2ad4b4910227755 4af39355df06c0b9 6f93c453af096a52 64854a8e9efaedde 6890ddde5d086980 963c6b12adcbb132 af5ebafc202e1fa7
payment-failed fed7450f74aa8f8d da8f311c1f06d769 af6725435487811c 0baaebd0717d5698
payment-receipt 6fec1374ac57a725 5f02f58c5c6657b5 c48ef3772159a3f2 10c60ae7afa5ec27 5bacc9706f59c254 7373d6f52f8993ae f68cb45e42bc2c24 340490efa659a36c ee7390c5553261e6 79e44c5616a43933 022d6a6e1b0fba24 6fc521b996e20e6e e59734224ec823f9
payment-receipt-gift-card 990701cc7bdc3cb0 861838faa7bd7199 9a1632c8aa7b1024 55381a36e25c43ef
payment-receipt-pod 9be811c84f90c5f7 dd39ebcbc83f15ca a23e94ec6199a23b e2c695369f48df3f
payment-receipt-product fb62674270d3528d 4248f754bcab63bc 6bde1b579695339a fa0c09d9a029f47b
payment-release-approved e521b7d447624375 a5948adec9582e8f a4d45de4f3828739 815012d20c0a18f2 766761fbe1079075 5d4ff1dc97687c44 8d63aee1bcf977c8 ddda1cf5192cef3e 718d1397cef8be09
payout-rejected c9ef750e354f5bee c8e61db173685857 5bf8868680d09954
payout-statement e7ad8c368fd401ec 46fd6a297b53e31e 803e42e57a129540 b792d34cbca1e8b8 b652d78b2eb164af 9c0c958e70bdf7f2 d1893628b4bb1a76 179d8c8992b8ac33
payout-submitted 72a2b9522069ced3 c1cf2be6422e2201 a22cea9bc832e74f
pod-backout-spot-filled 81f358e0e5e25c1f 2c1b9423be3d54f7 c5afd28d5a8dc569 83f87c3c6ed5261e de53187f17fdb69b
pod-calculator-report fd0fe84806670ab3 195dc0bfab17afe7 effce4683ec300c2 3554306589a112e3
pod-cancelled 0917e42724445b1c 401c4efbf7d44096 3e116fa4fc776829 af0007c4cb068360 d8eb972e04b3bd93 178197669398f77e c96c7abc4aa6076a e2ca2794df1a9cc1
pod-refund ca7affe3cf10754e eb8e268008fd64e7 9779447fbbc73e81 be94bd68ff8238e7 0864fbf4f1712a89 646147c1f748d613 b8423206bf7799ea 8c39e40946e36f02 358039a2fe8d8e06 3e925300e1952bc3
pod-replacement-not-found ae173a603436a9f3 287ea5cfdd998a8f 81d25d56f3ad50ef 51cdcd87b6e643bb
pod-shop-order-cancelled 7070521cf62bfacd b4ac6fe8ea66ecc8 68c0427e919948db 8e03062e3343eb76
pod-shop-order-delivered bbbe743c7802b100 b39547b81a88eefd ba9c38ce27aefd68
pod-shop-order-out-for-delivery c0c86288640ad002 bc33b84edd7d3ad4 33e1b8281872939d
pod-shop-order-shipped 9c34dfe5e790eba3 248dde0d7116ca5b 9d18762c71f05576
pod-shop-return-update 2daeef84041ff51e f2e9b09c8bfe0523 f7314e1f360958f6 be12daf9717f308e
pod-updated 598c89f781667845 fec3d30c044262c6 0fbf0296f036ef52 ebf89ede3f092d28 db7f9045e5e84785 e2a97937d53f2054 5b44dd6524c291ec 47cfc05649451dab
policy-acceptance fc6ae5df6858e199 0fe3b1aa1f415ef1 95b45da38a011b5a e25c1650e04c37fe
policy-updated 8170adad9de59bdd 02fd6948c2e40d8d 3aefae9255034125 40e007e98610c075
portal-access-approved 6b3e7d3baa44e063 fa2eaf95a5ece47d 89cbe7293cc88c02 6fcf286d1a1b5538
portal-access-declined 27d12980368c3171 d96331a3e00e4860 ee9ccd6406cc70f3 e624d339dfd15227
portal-login-otp fa42698cf1023975 3101fc94cb136461 500e039093d8cb32 1242a7106a996a7f
product-activated 2fc5091191f5a799 6153930b417223d6 fc60164aa24cd419 64aa02a304f8c66b
product-cart-reminder 1d8c0082c14e40cc 14580436f8f7a2e8 60f3727e30ca0572 f51635462eaf46c8
product-deactivated c550ba5c2d4142d5 a21357920f193dbe a6810a189ececad4 9b0a1e288eda1cbd
profile-blocked c5c27d5ec184f00b 3637cc72df036ec7 6d248bc1e7737d8b d013ba05f45ba65b
recent-account-login 7ab13ebd068cec75 2f38f2d6870675a7 f9131cfead1aa647 1666b6bbb839346d
referral-reward 56a50c6ff7a2fb31 c668edd084fbdef4 f09a15f12da6f1e2
signed-contract 3eb8992499e7da41 50649e1a23cae27c 7b3c12c1ab834ff7 52b38738c55b02e5
staff-alert cd5f4cce56439946 bec48b438e068552 5e1f606e24d1824c
store-autoship-due 9446c81d5bf247e1 d8313bcf19d45414 2ad6e82b5e151eb7 a1ed59c3b703be2e
store-back-in-stock fb0c1a668817626e f17a3c96046d5e9f b5ad88405498522b 3a268dab7767699e
store-cart-reminder b81503cf43c1404d d02c5d9423faf87c 322cde54bc6f674a f16fbaa99e764d66
store-order-cod 1a4f6f42a4609fc5 77d90b96544cd7a2 816ea66ebd03e738 48b0ffde6adebbe1
store-order-update bf6c6ec5127933aa 96e9e67912c11699 f16ebf941deb3162 96be7317d2af8223
store-release-approved 225859e12e068ed9 437d7450bc2474aa 1030f605847a80f1 a12ec4586f08bec5
store-release-rejected 06d51aa065d277cd 5513eac8f7d0cf7f 66da2e9f67bd4f11 1065f9e97f7016be
store-release-reminder 740a7c8d941e429e b4e6972edb36123d 8cee3bd74f721ea6 60e50414250e231c
store-return-update 2375fe0324e565d9 eae964148a16c289 726205d9a132a74d 68bf0d277fc345a4
support-feedback bd8be0c157b69bd4 8669d7e1fc8f03e8 c1531d768ebf512e 72febbd321e7f806
support-ticket-created ee081bb296f80db7 be2d849917c8a0e8 d98540e7baf65486 b5d611b6642e3e33
support-ticket-in-progress 26bcf35aca6fc116 7df2af52a15e0e8c 6a247ff19775ee94 3a0b6b5118a02126
support-ticket-reopened 92b11bbbfba98dea 255b45459a0c6ff5 e807541d8354b58c adfd34f85689f3c0
support-ticket-resolved bda3cfa000e2723e 204b8aa2e9c272ed c62cce94bc343a3b 57d3f7a49d41cf6d
support-ticket-updated ed27c4978263b692 33a355d7a83640cf 0e54ce6d4b9ee8ac 56ca9913d71e499c
unsubscribe-confirmed b5e128e1db9255e6 ca05536c9986d5d1 9ce73b50ca21fd37 bb177e2362499f89
user-account-reactivated be3bb993892cb5ff e307a474f1e898b6 41d2980e2058816e 31626f04cde13984
user-account-suspended 3279c9032741131a b5ef0f83edee8b45 e4b88adaff525a8e f93343e8201a5613
user-challenge-live 4d8d4e71033a9bd7 8bac00b8f0fc68e9 13171ddacea6858f 433b7a632ecd7846
user-challenge-result a6c0e1934cc86db4 f8ca329d38c05099 fb9b5b8af8513867 4403f9dfab7d5f3e
user-checkout-pending 721c36491f651af9 f9be9b025c6001c9 b2913f7d86bebe72
user-pod-cancelled-by-duncit 179394d42ef902b3 19ab29824e402976 e5e001ff0855e2d1 0aad2577375b8450
user-pod-cancelled-by-host c3867c072c3b9329 1e14394eba41cbe7 edf1a60b9f51b0e3 b8dde43b4091c006
user-pod-cancelled-by-venue 5a7f40d98771dcf3 6a7e95be294a4d79 44b3bb275d0a7897 30ed6bda4244ba18
user-pod-feedback bf962743abc689b6 4c3fa2a7de8e8c7d ed97be421bafa896 aa17de696c8768f3
user-pod-reminder 63a5e84d2fa759c4 db5cfa594271a40e 019e631536e2bd86 11998c08fcee8b25
user-pod-reminder-sameday 9a2df3c5b35796b4 efbcb1e831eb8a8f 5ef8355a43425366
user-pod-rescheduled a204c1e6656233ef bd2427ac040da124 c0a6f2080fd57f70
venue-activated a981bfa14fbbe8fb 341264d8cde0cd3a bdbed892dc761f7d 0299dc1b421e6271
venue-change-request-offer e2922f83c95bdaff 090ab095a4fb298f 2ccda32890dca365 cce64d11a8602475
venue-deactivated c509605b7dd0c439 2e14b8051ece8303 7ac1816ab42c3ad7 44c815503557ea46
venue-meeting-rescheduled 98e457914d51ce04 34ff8ca22fdab396 7fd23360f4cad665 a5a1b6e2fbfc5a7c
venue-new-added c5672011b1f02927 96c324aa522d9269 cac7d171ee3e00b6 8ca55296dc1a9db9
venue-offer-received 92b5997876589896
venue-onboarding-approved 5a1c50067b4179f3 d2d70bd9149dd4c7 3bd23f72eb963ce5 84c4839b7e67c9b8
venue-onboarding-booked f2f97def3ab673d2 c83df46330e6b014 f7b5d9d678fb907c fa4716ecd6b83d57 7fad23223d42162c
venue-onboarding-interview 4b6c11d321f0bd16 6afef9fe8ce417fa 4b18c542f57f7e56 ca34d40f453f5437 f9aa4481c8b2411f
venue-onboarding-rejected ba10322b44f8820e 1667dab113af5a2f 08bd19a1e824eda0 fbae31197fd170fa
venue-pod-cancelled 97e28f2dcbc28fac cd0d0944874372a0 87ec078bbc18530e
venue-pod-feedback e5982b94255d398c 04046dcc1411d949 87ec8139350183f9 77305ec04972cf2f
venue-pod-published 4acfff3b49326b49 4231edf299137c4a 521739fee6574937 39c4e08ccc2f3549
venue-pod-reminder a5cac7811b1621d5 04611bd666be7e20 5273b66937ec9f29
venue-slot-approved 585811122d8bb8f4 c89db9306e43c0ac a432439b34d5650f 7deff97916bf0868
venue-slot-pending-reminder 66ef9a8848f1df46 986d0524c75bd9e9 094cf99ae0033c34 3e11e2f3bc229b27
venue-slot-rejected 1d12344f16aff757 b85f98482d24a233 d9f223175f681cbe cf92492734244ad4
venue-slot-request 041454aa4ab56cc8 fb89abfb93ebb98a 530b6e504b5d1620 732a91b7cd3cfc33 8d98caba9779bd19 0fa4dbd3e9090e33 dd1cbb98acf3fc99
welcome 52cf3dc809b2a7a6 5d1cb1988bb0b4f6 8671331ab67f3d0e bb0ca500248f148e 01df436679a32264 c96f793465cbd53d 8ad4fefe86cd0bac 58fbdbfbdb4aa03d 38d31923aa09ed47 4470a156d1840a6b ff0aa5713f7cd9b7
`;

export const LEGACY_TEMPLATE_FINGERPRINTS: Readonly<Record<string, readonly string[]>> = Object.fromEntries(
  TEMPLATE_TABLE.trim()
    .split(/\r?\n/)
    .map((line) => {
      const [slug, ...prints] = line.trim().split(/\s+/);
      return [slug, prints];
    })
);

export const LEGACY_FRAGMENT_FINGERPRINTS: Readonly<
  Record<string, { readonly header: readonly string[]; readonly footer: readonly string[] }>
> = {
  transactional: { header: ["c557645e873e4842", "daadff1680e656bf", "b1458b3077e86b28"], footer: ["67c7106f77cc47bd", "c6e3bbeed6751875", "e83b6573821db755", "ce33e462280471c6"] },
  authentication: { header: ["c557645e873e4842", "daadff1680e656bf", "f38cc900b4d5900a"], footer: ["67c7106f77cc47bd", "c6e3bbeed6751875", "e83b6573821db755", "febd7d7ad5263ff5"] },
  marketing: { header: ["c557645e873e4842", "daadff1680e656bf", "d6fa752af0ce0e5b"], footer: ["d09aa2307f4d5f71", "b22603c197d53697", "377fd8633c03f2b4", "67c7106f77cc47bd", "3f2d2977c7660722"] },
  service: { header: ["c557645e873e4842", "daadff1680e656bf", "69aea63c68350485"], footer: ["d09aa2307f4d5f71", "b22603c197d53697", "377fd8633c03f2b4", "67c7106f77cc47bd", "1ebb5e55f550fdc4"] },
  notification: { header: ["c557645e873e4842", "daadff1680e656bf", "6c22f2adf0ffdd3c"], footer: ["d09aa2307f4d5f71", "b22603c197d53697", "377fd8633c03f2b4", "67c7106f77cc47bd", "3897024b192b3945"] },
  support: { header: ["c557645e873e4842", "daadff1680e656bf", "f342ca1938a0435e"], footer: ["d09aa2307f4d5f71", "b22603c197d53697", "377fd8633c03f2b4", "67c7106f77cc47bd", "55f4602f29a14dc0"] },
  billing: { header: ["c557645e873e4842", "daadff1680e656bf", "febceb4105729a89"], footer: ["67c7106f77cc47bd", "c6e3bbeed6751875", "e83b6573821db755", "a032c4b92aeaa4d6"] },
  legal: { header: ["c557645e873e4842", "daadff1680e656bf", "11c27c667bfd00ef"], footer: ["67c7106f77cc47bd", "c6e3bbeed6751875", "e83b6573821db755", "fccc06ce66c763eb"] },
  internal: { header: ["c557645e873e4842", "daadff1680e656bf", "f8a3e618cdc33cf3"], footer: ["67c7106f77cc47bd", "c6e3bbeed6751875", "e83b6573821db755", "cae8f313e83f0ee8"] },
};

/**
 * Templates first shipped AFTER the redesign, so no earlier default of theirs
 * ever existed and there is nothing to fingerprint. Their stored rows are
 * created from the current body and never need an upgrade. Listed explicitly
 * so a template that DID ship before (and is missing its fingerprints) still
 * fails the unit test instead of slipping through as "new".
 */
export const SHIPPED_AFTER_REDESIGN: ReadonlySet<string> = new Set<string>([
  // Empty since 2026-10-27: env-access-otp and the two venue-offer mails
  // shipped a body before the phone layout, so they have fingerprints now.
]);
