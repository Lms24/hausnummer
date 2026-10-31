<script lang="ts">
	import LegalPage from '#lib/components/LegalPage.svelte';
</script>

<LegalPage title="Datenschutzerklärung">
	<p>
		Kurz gesagt: Hausnummer sammelt keine Daten über euch. Eure Eingaben verlassen euren Browser nicht. Es
		gibt keine Konten, keine Cookies, keine Analyse- oder Trackingdienste und keine eingebundenen Inhalte von
		Dritten.
	</p>

	<h2>Verantwortlicher</h2>
	<p>
		Lukas Stracke, Wien. Kontakt über
		<a href="https://github.com/Lms24/hausnummer/issues" rel="noopener">github.com/Lms24/hausnummer</a>.
	</p>

	<h2>Eure Eingaben</h2>
	<p>
		Gehälter, Eigenmittel, Kaufpreis und alle anderen Eingaben werden nur im lokalen Speicher eures Browsers
		(localStorage) abgelegt, damit sie beim nächsten Besuch noch da sind. Sie werden nie an einen Server
		übertragen. Ihr könnt sie jederzeit mit „Alle Eingaben zurücksetzen“ oder über die Einstellungen eures
		Browsers löschen.
	</p>

	<h2>Hosting</h2>
	<p>
		Die Website wird über Cloudflare (Cloudflare, Inc., 101 Townsend St., San Francisco, CA 94107, USA)
		ausgeliefert. Beim Aufruf verarbeitet Cloudflare technisch notwendige Verbindungsdaten wie IP-Adresse,
		Zeitpunkt, aufgerufene Adresse und Browserkennung, um die Seite auszuliefern und vor Angriffen zu
		schützen. Rechtsgrundlage ist unser berechtigtes Interesse an einem sicheren und funktionierenden
		Betrieb (Art. 6 Abs. 1 lit. f DSGVO). Cloudflare ist unter dem EU-US Data Privacy Framework
		zertifiziert. Details:
		<a href="https://www.cloudflare.com/de-de/privacypolicy/" rel="noopener">Datenschutzerklärung von Cloudflare</a>.
	</p>

	<h2>Eure Rechte</h2>
	<p>
		Ihr habt das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung,
		Datenübertragbarkeit und Widerspruch. Außerdem könnt ihr euch bei der österreichischen
		Datenschutzbehörde beschweren (<a href="https://www.dsb.gv.at" rel="noopener">dsb.gv.at</a>).
	</p>
</LegalPage>
