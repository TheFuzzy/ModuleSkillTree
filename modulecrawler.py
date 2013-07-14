from bs4 import BeautifulSoup
import urllib2
import re

def modulecrawler():
	faculties = {
		"ARTS & SOCIAL SCIENCES": [	"CENTRE FOR LANGUAGE STUDIES",
									"CHINESE STUDIES",
									"COMMUNICATIONS AND NEW MEDIA",
									"DEAN'S OFFICE (ARTS & SOCIAL SC.)",
									"ECONOMICS",
									"ENGLISH LANGUAGE & LITERATURE",
									"GEOGRAPHY",
									"HISTORY",
									"JAPANESE STUDIES",
									"MALAY STUDIES",
									"PHILOSOPHY",
									"POLITICAL SCIENCE",
									"PSYCHOLOGY",
									"SOCIAL WORK",
									"SOCIOLOGY",
									"SOUTH ASIAN STUDIES PROGRAMME",
									"SOUTHEAST ASIAN STUDIES"],
		"DENTISTRY": [				"DENTISTRY",
									"DIVISION OF GRADUATE DENTAL STUDIES"],
		"ENGINEERING": [			"BACHELOR OF TECHNOLOGY PROGRAMME",
									"BIOENGINEERING",
									"CHEMICAL & BIOMOLECULAR ENGINEERING",
									"CIVIL & ENVIRONMENTAL ENGINEERING",
									"CTR FOR ADV COMPUTATIONS IN ENGG SCIENCE",
									"DEAN'S OFFICE (ENGINEERING)",
									"DIVISION OF ENGINEERING AND TECH MGT",
									"ELECTRICAL & COMPUTER ENGINEERING",
									"ENGINEERING SCIENCE PROGRAMME",
									"INDUSTRIAL & SYSTEMS ENGINEERING",
									"MATERIALS SCIENCE AND ENGINEERING",
									"MECHANICAL ENGINEERING",
									"MINERALS, METALS AND MATERIAL TECH. CTR",
									"NANOENGINEERING PROGRAMME",
									"SINGAPORE-DELFT WATER ALLIANCE"],
		"JOINT MULTI-DISCIPLINARY PROGRAMMES": [
									"COMPUTING & ENGINEERING"],
		"LAW": [					"LAW"],
		"NON-FACULTY-BASED DEPARTMENTS": [
									"CTR FOR ENGLISH LANGUAGE COMMUNICATION",
									"ANGSANA COLLEGE",
									"TEMBUSU COLLEGE",
									"CENTRE FOR QUANTUM TECHNOLOGIES"],
		"SCHOOL OF BUSINESS": [
									"ACCOUNTING",
									"CENTRE FOR E-BUSINESS",
									"DEAN'S OFFICE (BIZ)",
									"DECISION SCIENCES",
									"FINANCE",
									"HUMAN RESOURCE MANAGEMENT UNIT",
									"MANAGEMENT AND ORGANISATION",
									"MARKETING",
									"STRATEGY AND POLICY"],
		"SCHOOL OF COMPUTING": [
									"COMPUTER SCIENCE",
									"DEAN'S OFFICE (SCHOOL OF COMPUTING)",
									"INFORMATION SYSTEMS"],
		"SCHOOL OF DESIGN AND ENVIRONMENT": [
									"ARCHITECTURE",
									"BUILDING",
									"DEAN'S OFFICE (SCHOOL OF DESIGN & ENV)",
									"DIVISION OF INDUSTRIAL DESIGN",
									"REAL ESTATE"],
		"SCIENCE": [
									"BIOLOGICAL SCIENCES",
									"CENTRE FOR COMPUTATIONAL SCIENCE & ENGRG",
									"CHEMISTRY",
									"DEAN'S OFFICE (SCIENCE)",
									"MATHEMATICS",
									"PHARMACY",
									"PHYSICS",
									"STATISTICS & APPLIED PROBABILITY",
									"ZOOLOGICAL REFERENCE COLLECTIONS"],
		"UNIVERSITY ADMINISTRATION": [
									"OFFICE OF STUDENT AFFAIRS"],
		"UNIVERSITY SCHOLARS PROGRAMME": [
									"UNIVERSITY SCHOLARS PROGRAMME"],
		"YONG LOO LIN SCHOOL OF MEDICINE": [
									"ANAESTHESIA",
									"ANATOMY",
									"BIOCHEMISTRY",
									"CENTRE FOR MOLECULAR EPIDEMIOLOGY",
									"DEAN'S OFFICE (MEDICINE)",
									"DIAGNOSTIC RADIOLOGY",
									"DIVISION OF GRADUATE MEDICAL STUDIES",
									"ELECTRON MICROSCOPE UNIT",
									"MEDICINE",
									"MICROBIOLOGY",
									"NATIONAL UNIVERSITY MEDICAL INSTITUTES",
									"NURSING/ALICE LEE CTR FOR NURSING STUD",
									"OBSTETRICS & GYNAECOLOGY",
									"OPHTHALMOLOGY",
									"ORTHOPAEDIC SURGERY",
									"OTOLARYNGOLOGY",
									"PAEDIATRICS",
									"PATHOLOGY",
									"PHARMACOLOGY",
									"PHYSIOLOGY",
									"PSYCHOLOGICAL MEDICINE",
									"SURGERY",
									"WHO IMMUNOLOGY RESEARCH & TRAINING CTR"],
		"YONG SIEW TOH CONSERVATORY OF MUSIC": [
									"YONG SIEW TOH CONSERVATORY OF MUSIC"]
	}
	url = "https://aces01.nus.edu.sg/cors/jsp/report/"
	htmlContent = urllib2.urlopen("https://aces01.nus.edu.sg/cors/jsp/report/ModuleInfoListing.jsp").read()
	htmlContent = re.sub(r'</td>[\s]*<tr valign="top">', r'</td></tr><tr valign="top">', htmlContent, flags=re.IGNORECASE)
	htmlContent = re.sub(r'</a></div>[\s]*<br><br>', r'</a><br><br>', htmlContent, flags=re.IGNORECASE)
	#print htmlContent
	soup = BeautifulSoup(htmlContent)
	modules = soup.find_all('tr', valign='top')
	moduleList = {}

	for m in modules:
		module = {}
		t = m.find_all('td')
		link = m.find_all('a', href=re.compile("ModuleDetailedInfo.jsp?"))
		detailContent = urllib2.urlopen(url+link[0]['href']).read()
		soup = BeautifulSoup(detailContent)
		details = soup.find('table', class_="tableframe")
		row = details.find_all('tr')
		code = t[1].find('a').string
		module['code'] = code
		module['name'] = row[2].find('td',colspan="2").string
		module['description'] = row[3].find('td',colspan="2").string
		module['mc'] = t[3].find('div').string
		
		department = t[8].find('div').string.strip()
		for f, d in faculties.iteritems():
			if department in d:
				module['faculty'] = f

		wl = row[9].find('td', colspan="2").string
		if len(wl) <= 4:
			wl = "-"
		module['workload'] = wl
		module['preclusion_string'] = row[8].find('td', colspan="2").string
		module['preclusion'] = []
		module['prerequisites_string'] = row[7].find('td', colspan="2").string
		module['prerequisites'] = []

		moduleList[code.split('/')[0]] = module

	return moduleList
